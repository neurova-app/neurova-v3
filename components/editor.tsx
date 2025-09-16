"use client";

import React, { useEffect, useRef, useState } from "react";
import EditorJS, { OutputData } from "@editorjs/editorjs";
import { EDITOR_TOOLS } from "@/lib/tool";
import { Button } from "@/components/ui/button";
import {
  Asterisk,
  Heading,
  ImagePlus,
  List,
  TriangleAlert,
  Save,
  CalendarIcon,
  PlusCircle,
  Trash,
} from "lucide-react";
import { DEFAULT_EDITOR_DATA_TOOLS } from "@/lib/default";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveMedicalHistoryNote } from "@/lib/supabase/saveMedicalHistoryNote";
import { deleteMedicalHistoryNote } from "@/lib/supabase/deleteMedicalHistoryNote";
import { updateMedicalHistoryNote } from "@/lib/supabase/updateMedicalHistoryNote";
import { formatLocalDateTime } from "@/lib/utils";

interface EditorProps {
  patientId: string;
  noteId?: string; // for editing an existing note
  data?: OutputData;
  date?: string;
}

export const Editor = ({
  patientId,
  noteId: initialNoteId,
  data,
  date,
}: EditorProps) => {
  const ref = useRef<EditorJS | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    date ? new Date(date) : new Date()
  );
  const [noteId, setNoteId] = useState<string | undefined>(initialNoteId);
  const queryClient = useQueryClient();

  // Sync noteId and date when props change (when selecting a session from list)
  useEffect(() => {
    setNoteId(initialNoteId);
    if (date) {
      setSelectedDate(new Date(date));
    } else if (!initialNoteId) {
      // Only set current date for new sessions (no noteId)
      setSelectedDate(new Date());
    }
    // Reset changes flag when switching sessions
    setHasChanges(false);
  }, [initialNoteId, date]);

  // Initialize EditorJS
  useEffect(() => {
    if (!ref.current) {
      const editor = new EditorJS({
        holder: "editorjs",
        autofocus: true,
        data: data || { time: new Date().getTime(), blocks: [] },
        tools: EDITOR_TOOLS,
        onChange: () => setHasChanges(true),
        onReady: () => setIsReady(true),
      });

      ref.current = editor;
    } else if (data) {
      // If already initialized, load new data when switching sessions
      ref.current.render(data);
      setHasChanges(false);
    }

    return () => {
      if (ref.current?.destroy) {
        ref.current.destroy();
        ref.current = null;
        setIsReady(false);
      }
    };
  }, [data]);

  const handleInsert = (type: string) => {
    if (!ref.current || !isReady) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const defaultDataMap: Record<string, any> = DEFAULT_EDITOR_DATA_TOOLS;
    ref.current.blocks.insert(type, defaultDataMap[type] || {});
  };

  // Save Mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!ref.current) return;
      const content = await ref.current.save();

      // Find blocks
      const firstHeader = content.blocks.find(
        (block) => block.type === "header"
      );
      const paragraphs = content.blocks.filter(
        (block) => block.type === "paragraph"
      );

      let title = "Untitled Session";
      let description = "";

      if (firstHeader && firstHeader.data.text?.trim()) {
        title = firstHeader.data.text.trim();
        if (paragraphs[0]?.data?.text) {
          description = paragraphs[0].data.text.trim();
        }
      } else if (paragraphs.length > 0) {
        title = paragraphs[0].data.text.trim();
        if (paragraphs[1]?.data?.text) {
          description = paragraphs[1].data.text.trim();
        }
      }

      if (noteId) {
        await updateMedicalHistoryNote({
          id: noteId,
          title,
          description,
          date: formatLocalDateTime(selectedDate),
          content,
        });
        return { id: noteId }; // Keep current id
      } else {
        // Make sure saveMedicalHistoryNote returns the created note id
        // Combine selected date with current time
        const now = new Date();
        const dateWithCurrentTime = new Date(selectedDate);
        dateWithCurrentTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        
        const { id: newId } = await saveMedicalHistoryNote({
          patient_id: patientId,
          title,
          description,
          date: formatLocalDateTime(dateWithCurrentTime),
          content,
        });
        return { id: newId };
      }
    },
    onSuccess: (result) => {
      toast.success(
        noteId
          ? "Session updated successfully!"
          : "Session created successfully!"
      );
      // Refetch immediately for faster UI update
      queryClient.refetchQueries({ queryKey: ["sessions", patientId] });

      if (!noteId && result?.id) {
        setNoteId(result.id); // store the new note id so future saves are updates
      }

      setHasChanges(false);
    },
    onError: (error) => {
      toast.error("Error saving session", {
        description: error.message || "Please try again.",
      });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!noteId) return;
      return deleteMedicalHistoryNote(noteId);
    },
    onSuccess: () => {
      toast.success("Session deleted successfully!");
      queryClient.invalidateQueries({ queryKey: ["sessions", patientId] });
      handleNewSession(); // Clear editor after delete
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error("Error deleting session", {
        description: error.message || "Please try again.",
      });
    },
  });

  // Create new empty session
  const handleNewSession = () => {
    setNoteId(undefined);
    setSelectedDate(new Date());
    if (ref.current) {
      ref.current.clear();
    }
    setHasChanges(false);
  };

  return (
    <>
      {/* Toolbar */}
      <div className="sticky top-0 z-50 flex justify-center gap-2  py-2 shadow-md items-center">
        {/* New Session */}
        <Button
          size="sm"
          variant="outline"
          onClick={handleNewSession}
          disabled={saveMutation.isPending}
        >
          <PlusCircle className="mr-1" /> New Session
        </Button>

        {/* Date Selector */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Tools */}
        <Button
          size="sm"
          onClick={() => handleInsert("header")}
          className="bg-primary text-primary-foreground"
        >
          <Heading className="mr-1" /> Header
        </Button>
        <Button
          size="sm"
          onClick={() => handleInsert("list")}
          className="bg-primary text-primary-foreground"
        >
          <List className="mr-1" /> List
        </Button>
        <Button
          size="sm"
          onClick={() => handleInsert("image")}
          className="bg-primary text-primary-foreground"
        >
          <ImagePlus className="mr-1" /> Image
        </Button>
        <Button
          size="sm"
          onClick={() => handleInsert("warning")}
          className="bg-primary text-primary-foreground"
        >
          <TriangleAlert className="mr-1" /> Warning
        </Button>
        <Button
          size="sm"
          onClick={() => handleInsert("delimiter")}
          className="bg-primary text-primary-foreground"
        >
          <Asterisk className="mr-1" /> Delimiter
        </Button>

        <div className="flex items-center gap-2">
          {/* Save Button */}

          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            className="bg-green-600 text-white"
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save />
          </Button>

          {/* Delete Session */}
          {noteId && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash />
            </Button>
          )}
        </div>
      </div>

      {/* Editor Container */}
      <div id="editorjs" className="h-[540px] max-h-[600px] mt-10" />
    </>
  );
};
