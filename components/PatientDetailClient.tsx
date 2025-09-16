"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@/components/editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPatientById } from "@/lib/supabase/getPatientById";
import { getSessionsByPatientId } from "@/lib/supabase/getSessionsByPatientId";
import { EmergencyContactCard } from "./PatientDetail/EmergencyContactCard";
import { PatientInfoCard } from "./PatientDetail/PatientInfoCard";
import { saveMedicalHistory } from "@/lib/supabase/saveMedicalHistory";
import { SessionList } from "./PatientDetail/SessionList";
import { toast } from "sonner";
import { SkeletonSessionList } from "./PatientDetail/skeletons/SkeletonSessionList";
import { OutputData } from "@editorjs/editorjs";
import { medicalHistoryLabels } from "@/lib/utils";

export default function PatientDetailClient({ id }: { id: string }) {
  const [activeTab, setActiveTab] = useState("personal-information");
  const [selectedSession, setSelectedSession] = useState<{
    id?: string; // optional so we know if it’s new or existing
    content?: OutputData;
    date?: string;
  }>({});

  const [medicalHistory, setMedicalHistory] = useState({
    expectations: "",
    mainTopic: "",
    symptoms: "",
    familyInfo: "",
    diagnosis: "",
  });

  const queryClient = useQueryClient();

  // Patient query
  const { data: patient, isLoading } = useQuery({
    queryKey: ["patient", id],
    queryFn: () => getPatientById(id),
    enabled: !!id,
  });

  // Sessions query — only runs when tab is open
  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ["sessions", id],
    queryFn: () => getSessionsByPatientId(id),
    enabled: activeTab === "medical-history" && !!id,
  });

  useEffect(() => {
    if (patient?.medical_history) {
      setMedicalHistory({
        expectations: patient.medical_history.expectations ?? "",
        mainTopic: patient.medical_history.mainTopic ?? "",
        symptoms: patient.medical_history.symptoms ?? "",
        familyInfo: patient.medical_history.familyInfo ?? "",
        diagnosis: patient.medical_history.diagnosis ?? "",
      });
    }
  }, [patient]);

  const saveMutation = useMutation({
    mutationFn: (data: typeof medicalHistory) => saveMedicalHistory(id, data),
    onSuccess: () => {
      toast.success("Medical history updated", {
        description:
          "The patient's medical history has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["patient", id] });
    },
    onError: (err: unknown) => {
      toast.error("Error saving medical history", {
        description:
          err instanceof Error ? err.message : "An unknown error occurred",
      });
    },
  });

  if (isLoading || !patient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="mt-6 flex justify-between gap-6">
      {/* LEFT COLUMN */}
      <AnimatePresence mode="wait">
        {activeTab === "personal-information" && (
          <motion.div
            key="info-card"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-4 w-72"
          >
            <PatientInfoCard {...patient} id={id} />
            <EmergencyContactCard
              emergency_contact={patient.emergency_contact}
              patientId={id}
            />
          </motion.div>
        )}

        {activeTab === "medical-history" && (
          <motion.div
            key="sessions"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            {isSessionsLoading ? (
              <SkeletonSessionList />
            ) : (
              <SessionList
                sessionsByMonth={groupSessionsByMonth(sessions ?? [])}
                onSelectSession={(session) =>
                  setSelectedSession({
                    id: session.id,
                    content: session.content,
                    date: session.date,
                  })
                }
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT COLUMN */}
      <motion.div
        animate={{ width: "calc(100% - 18rem)" }}
        transition={{ duration: 0.4 }}
        className="h-[660px] max-h-[660px] overflow-scroll"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="personal-information">Summary</TabsTrigger>
            <TabsTrigger value="medical-history">Medical History</TabsTrigger>
          </TabsList>

          <TabsContent
            value="personal-information"
            className="flex flex-col gap-3 mt-4"
          >
            {Object.entries(medicalHistory).map(([key, value]) => (
              <div key={key}>
              <Label>{medicalHistoryLabels[key] ?? key}</Label>
                <Textarea
                  value={value}
                  onChange={(e) =>
                    setMedicalHistory((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
            <Button
              onClick={() => saveMutation.mutate(medicalHistory)}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </TabsContent>

          <TabsContent
            value="medical-history"
            className="h-[590px] max-h-[590px] border-2"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="h-[590px] max-h-[590px] overflow-scroll"
            >
              <Editor
                data={selectedSession.content}
                patientId={patient.id}
                noteId={selectedSession.id}
                date={selectedSession.date}
              />
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupSessionsByMonth(sessions: any[]) {
  return sessions.reduce((acc, session) => {
    const date = new Date(session.date);
    const monthLabel = date.toLocaleDateString("es-CO", {
      month: "long",
      year: "numeric",
    });
    if (!acc[monthLabel]) acc[monthLabel] = [];
    acc[monthLabel].push(session);
    return acc;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as Record<string, any[]>);
}
