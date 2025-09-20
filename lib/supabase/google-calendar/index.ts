// services/calendarService.ts
import { createClient } from "../client";

async function refreshGoogleAccessToken(): Promise<string> {
  const supabase = createClient();
  
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error("No active session found");
  }

  if (!session.provider_refresh_token) {
    throw new Error("No refresh token available. Please re-authenticate with Google.");
  }

  try {
    // Use Supabase's built-in token refresh
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      throw new Error(`Failed to refresh token: ${error.message}`);
    }

    if (!data.session?.provider_token) {
      throw new Error("Failed to get new access token after refresh");
    }

    return data.session.provider_token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw new Error("Failed to refresh Google access token. Please re-authenticate with Google.");
  }
}


async function makeGoogleAPICall(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  const makeRequest = async (token: string): Promise<Response> => {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    return fetch(url, {
      ...options,
      headers,
    });
  };
  
  // Get current session token
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.provider_token) {
    throw new Error("Google access token not found. Please re-authenticate with Google.");
  }
  
  // First attempt with current token
  let response = await makeRequest(session.provider_token);
  
  // If unauthorized (401), try refreshing the token
  if (response.status === 401) {
    console.log('Access token expired, refreshing...');
    try {
      const refreshedToken = await refreshGoogleAccessToken();
      response = await makeRequest(refreshedToken);
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      throw new Error("Authentication failed. Please re-authenticate with Google.");
    }
  }
  
  return response;
}

export interface CalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  location?: string;
  htmlLink?: string;
  conferenceData?: {
    conferenceId?: string;
    conferenceSolution?: {
      name?: string;
      type?: string;
    };
    entryPoints?: Array<{
      entryPointType?: string;
      uri?: string;
      label?: string;
    }>;
  };
  recurrence?: string[];
}

export interface CalendarInfo {
  id: string;
  name: string;
  created_at: string;
}

export interface CreateAppointmentData {
  summary: string;
  description?: string;
  start: {
    dateTime: string; // ISO string like "2024-01-15T10:00:00"
    timeZone?: string;
  };
  end: {
    dateTime: string; // ISO string like "2024-01-15T11:00:00"
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  isRecurring?: boolean;
  recurrenceType?: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "none";
  recurrenceEndDate?: string;
}

function createRecurrenceRule(
  recurrenceType: "daily" | "weekly" | "biweekly" | "monthly" | "yearly" | "none",
  endDate?: string
): string[] | undefined {
  // Return undefined if not recurring
  if (recurrenceType === "none") {
    return undefined;
  }
  
  const recurrenceRules: string[] = [];
  
  // Base RRULE mapping
  const ruleMap = {
    daily: "FREQ=DAILY",
    weekly: "FREQ=WEEKLY",
    biweekly: "FREQ=WEEKLY;INTERVAL=2",
    monthly: "FREQ=MONTHLY",
    yearly: "FREQ=YEARLY"
  };
  
  let rrule = `RRULE:${ruleMap[recurrenceType]}`;
  
  // Add end date if provided
  if (endDate) {
    // Convert YYYY-MM-DD to YYYYMMDD format for RRULE
    const formattedEndDate = endDate.replace(/-/g, '') + 'T235959Z';
    rrule += `;UNTIL=${formattedEndDate}`;
  }
  
  recurrenceRules.push(rrule);
  return recurrenceRules;
}

async function getOrCreateCalendarId(): Promise<string> {
  const supabase = createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get therapist profile with calendar_info
  const { data: therapist } = await supabase
    .from("therapists")
    .select("id, calendar_info")
    .eq("user_id", user.id)
    .single();
  
  if (!therapist) throw new Error("Therapist profile not found");

  // Check if we have calendar_info with an id
  if (therapist.calendar_info?.id) {
    return therapist.calendar_info.id;
  }

  // Create new calendar
  const createResponse = await makeGoogleAPICall(
    'https://www.googleapis.com/calendar/v3/calendars',
    {
      method: 'POST',
      body: JSON.stringify({
        summary: 'Neurova Appointments',
        description: 'Calendar for Neurova therapy appointments',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
    }
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    throw new Error(`Failed to create calendar: ${errorText}`);
  }

  const calendarData = await createResponse.json();
  const calendarId = calendarData.id;

  // Save calendar info to database
  const newCalendarInfo: CalendarInfo = {
    id: calendarId,
    name: calendarData.summary,
    created_at: new Date().toISOString()
  };

  await supabase
    .from("therapists")
    .update({ calendar_info: newCalendarInfo })
    .eq("id", therapist.id);

  return calendarId;
}

export async function getUpcomingAppointments(): Promise<CalendarEvent[]> {
  try {
    const calendarId = await getOrCreateCalendarId();

    // Get next 7 days of appointments
    const now = new Date();
    const nextWeek = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: nextWeek.toISOString(),
      maxResults: '50',
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const eventsResponse = await makeGoogleAPICall(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params}`
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      throw new Error(`Failed to fetch events: ${errorText}`);
    }

    const eventsData = await eventsResponse.json();
    return eventsData.items || [];

  } catch (error) {
    console.error('Error in getUpcomingAppointments:', error);
    return [];
  }
}

export async function createAppointment(appointmentData: CreateAppointmentData): Promise<CalendarEvent> {
  try {
    const calendarId = await getOrCreateCalendarId();

    // Generate recurrence rules if the appointment is recurring
    const recurrence = appointmentData.isRecurring && appointmentData.recurrenceType
      ? createRecurrenceRule(appointmentData.recurrenceType, appointmentData.recurrenceEndDate)
      : undefined;

    // Prepare event data with timezone information, Google Meet, and email notifications
    const eventData = {
      summary: appointmentData.summary,
      description: appointmentData.description,
      start: {
        dateTime: appointmentData.start.dateTime,
        timeZone: appointmentData.start.timeZone,
      },
      end: {
        dateTime: appointmentData.end.dateTime,
        timeZone: appointmentData.end.timeZone,
      },
      attendees: appointmentData.attendees,
      // Add recurrence rules if this is a recurring appointment
      recurrence: recurrence,
      // Automatically create Google Meet link
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          conferenceSolutionKey: {
            type: "hangoutsMeet"
          }
        }
      },
      // Allow guests to see other attendees and modify the event
      guestsCanSeeOtherGuests: true,
      guestsCanModify: false,
    };

    const createResponse = await makeGoogleAPICall(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: 'POST',
        body: JSON.stringify(eventData)
      }
    );

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create appointment: ${errorText}`);
    }

    const createdEvent = await createResponse.json();
    return createdEvent;

  } catch (error) {
    console.error('Error in createAppointment:', error);
    throw error;
  }
}

export async function cancelAppointment(eventId: string, cancelType: 'single' | 'series' = 'single'): Promise<void> {
  try {
    const calendarId = await getOrCreateCalendarId();

    // First, get the event to understand its structure
    const eventResponse = await makeGoogleAPICall(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
    );

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      throw new Error(`Failed to fetch event details: ${errorText}`);
    }

    const eventData = await eventResponse.json();

    if (cancelType === 'series') {
      // For series cancellation, we need to delete the master recurring event
      let masterEventId = eventId;
      
      // If this is an instance of a recurring event, use the recurringEventId instead
      if (eventData.recurringEventId) {
        masterEventId = eventData.recurringEventId;
      }

      // Cancel the entire series by deleting the master event
      const deleteResponse = await makeGoogleAPICall(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(masterEventId)}?sendUpdates=all`,
        {
          method: 'DELETE'
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        throw new Error(`Failed to cancel appointment series: ${errorText}`);
      }
    } else {
      // Cancel a single instance

      if (eventData.recurringEventId) {
        // This is already a single instance of a recurring event, delete it
        const deleteResponse = await makeGoogleAPICall(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
          {
            method: 'DELETE'
          }
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          throw new Error(`Failed to cancel appointment: ${errorText}`);
        }
      } else if (eventData.recurrence) {
        // This is a master recurring event, we need to cancel just this instance
        // Create a cancelled instance by updating the event with status: 'cancelled'
        const updateResponse = await makeGoogleAPICall(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              status: 'cancelled'
            })
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error(`Failed to cancel appointment: ${errorText}`);
        }
      } else {
        // This is a single, non-recurring event, delete it
        const deleteResponse = await makeGoogleAPICall(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
          {
            method: 'DELETE'
          }
        );

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          throw new Error(`Failed to cancel appointment: ${errorText}`);
        }
      }
    }

  } catch (error) {
    console.error('Error in cancelAppointment:', error);
    throw error;
  }
}