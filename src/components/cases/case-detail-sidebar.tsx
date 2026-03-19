"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CASE_STATUS, CASE_STATUS_LABELS, PAYMENT_STATUS } from "@/lib/constants";
import { useState } from "react";
import { CheckCircle2, DollarSign, FileCheck, Edit } from "lucide-react";

interface CaseDetailSidebarProps {
  caseId: number;
  currentStatus: string;
  paymentStatus: string;
  signedReceived: boolean;
  originalReceived: boolean;
  onUpdate: () => void;
}

export function CaseDetailSidebar({
  caseId,
  currentStatus,
  paymentStatus,
  signedReceived,
  originalReceived,
  onUpdate,
}: CaseDetailSidebarProps) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [newPaymentStatus, setNewPaymentStatus] = useState(paymentStatus);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setStatusDialogOpen(false);
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentUpdate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cases/${caseId}/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newPaymentStatus,
          ...(paymentAmount && { paymentAmount: parseFloat(paymentAmount) }),
        }),
      });

      if (response.ok) {
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update payment:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentTracking = async (field: "signedReceived" | "originalReceived", value: boolean) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error("Failed to update document tracking:", err);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
            <DialogTrigger>
              <Button variant="outline" className="w-full justify-start" onClick={() => setNewStatus(currentStatus)}>
                <Edit className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change Case Status</DialogTitle>
                <DialogDescription>Update the status of this case</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select value={newStatus} onValueChange={(value) => setNewStatus(value || currentStatus)}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CASE_STATUS).map((status) => (
                        <SelectItem key={status} value={status}>
                          {CASE_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStatusChange} disabled={loading}>
                  {loading ? "Updating..." : "Update Status"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogTrigger>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setNewPaymentStatus(paymentStatus);
                  setPaymentAmount("");
                }}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Update Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Payment</DialogTitle>
                <DialogDescription>Update payment status and record payment</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentStatus">Payment Status</Label>
                  <Select value={newPaymentStatus} onValueChange={(value) => setNewPaymentStatus(value || paymentStatus)}>
                    <SelectTrigger id="paymentStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(PAYMENT_STATUS).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.split("_").map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount (optional)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount received"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handlePaymentUpdate} disabled={loading}>
                  {loading ? "Updating..." : "Update"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleDocumentTracking("signedReceived", !signedReceived)}
          >
            <FileCheck className="h-4 w-4 mr-2" />
            {signedReceived ? "Unmark" : "Mark"} Signed Received
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => handleDocumentTracking("originalReceived", !originalReceived)}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {originalReceived ? "Unmark" : "Mark"} Original Received
          </Button>
        </div>
      </Card>
    </div>
  );
}
