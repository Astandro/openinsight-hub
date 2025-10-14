import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Thresholds } from "@/types/openproject";
import { Settings } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  thresholds: Thresholds;
  onSave: (thresholds: Thresholds) => void;
}

export const SettingsModal = ({ open, onOpenChange, thresholds, onSave }: SettingsModalProps) => {
  const [values, setValues] = useState<Thresholds>(thresholds);

  const handleSave = () => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dashboard Settings
          </DialogTitle>
          <DialogDescription>
            Adjust thresholds for performance flags and alerts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="topPerformerZ">Top Performer Z-Score</Label>
              <Input
                id="topPerformerZ"
                type="number"
                step="0.1"
                value={values.topPerformerZ}
                onChange={(e) => setValues({ ...values, topPerformerZ: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Users above this z-score are flagged as top performers</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lowPerformerZ">Low Performer Z-Score</Label>
              <Input
                id="lowPerformerZ"
                type="number"
                step="0.1"
                value={values.lowPerformerZ}
                onChange={(e) => setValues({ ...values, lowPerformerZ: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Users below this z-score need support</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highBugRate">High Bug Rate Threshold</Label>
              <Input
                id="highBugRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={values.highBugRate}
                onChange={(e) => setValues({ ...values, highBugRate: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Bug rate above this value (0-1) triggers alert</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="highReviseRate">High Revise Rate Threshold</Label>
              <Input
                id="highReviseRate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={values.highReviseRate}
                onChange={(e) => setValues({ ...values, highReviseRate: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Revise rate above this value (0-1) triggers alert</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="overloadedMultiplier">Overloaded Function Multiplier</Label>
              <Input
                id="overloadedMultiplier"
                type="number"
                step="0.1"
                min="1"
                value={values.overloadedMultiplier}
                onChange={(e) => setValues({ ...values, overloadedMultiplier: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Function avg SP × median to flag overload</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="underutilizedMultiplier">Underutilized Function Multiplier</Label>
              <Input
                id="underutilizedMultiplier"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={values.underutilizedMultiplier}
                onChange={(e) => setValues({ ...values, underutilizedMultiplier: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Function avg SP × median to flag underutilization</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
