"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ExtractedField {
  id: string;
  fieldName: string;
  value: string;
  confidence: number;
  isConfirmed: boolean;
}

interface ExtractedFieldsProps {
  documentId: string;
  fields: ExtractedField[];
  onFieldConfirm: (fieldId: string, confirmed: boolean) => void;
}

export function ExtractedFields({
  documentId,
  fields,
  onFieldConfirm,
}: ExtractedFieldsProps) {
  const [localFields, setLocalFields] = useState(fields);

  const handleConfirmToggle = async (fieldId: string, confirmed: boolean) => {
    // Optimistically update UI
    setLocalFields((prev) =>
      prev.map((field) =>
        field.id === fieldId ? { ...field, isConfirmed: confirmed } : field
      )
    );

    // Call parent callback for API update
    onFieldConfirm(fieldId, confirmed);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-600";
    if (confidence >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  if (localFields.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        No extracted fields available. Document may not be OCR processed yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Field Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-[100px] text-right">
                Confidence
              </TableHead>
              <TableHead className="w-[100px] text-center">
                Confirmed
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localFields.map((field) => (
              <TableRow key={field.id}>
                <TableCell className="font-medium">{field.fieldName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[300px]">
                      {field.value}
                    </span>
                    {field.confidence < 70 && (
                      <Badge variant="destructive" className="text-xs">
                        Low confidence
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell
                  className={`text-right font-medium ${getConfidenceColor(field.confidence)}`}
                >
                  {field.confidence}%
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <Checkbox
                      checked={field.isConfirmed}
                      onCheckedChange={(checked) =>
                        handleConfirmToggle(field.id, checked as boolean)
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-600" />
          <span>High confidence (90%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-600" />
          <span>Medium confidence (70-89%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-600" />
          <span>Low confidence (&lt;70%)</span>
        </div>
      </div>
    </div>
  );
}
