import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

interface CSVUploadProps {
  onFileSelect: (file: File) => void;
  onLoadSample: () => void;
}

export const CSVUpload = ({ onFileSelect, onLoadSample }: CSVUploadProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-center min-h-screen p-4"
    >
      <Card className="w-full max-w-2xl p-12 text-center border-2 border-dashed border-primary/30 bg-card/50 backdrop-blur">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
        >
          <FileSpreadsheet className="w-20 h-20 mx-auto mb-6 text-primary" />
        </motion.div>

        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          OpenProject Insight Hub
        </h1>
        <p className="text-muted-foreground mb-8 text-lg">
          Upload your OpenProject CSV export to visualize team performance and workload analytics
        </p>

        <div className="space-y-4">
          <div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button size="lg" className="w-full cursor-pointer" asChild>
                <span>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload CSV File
                </span>
              </Button>
            </label>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={onLoadSample}
          >
            Load Sample Dataset
          </Button>
        </div>

        <div className="mt-8 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-2">Required CSV columns:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {["Assignee", "Function", "Status", "Story Points", "Type", "Project", "Sprint Closed", "Created Date", "Closed Date", "Subject"].map((col) => (
              <span
                key={col}
                className="px-2 py-1 text-xs font-mono bg-secondary rounded"
              >
                {col}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
