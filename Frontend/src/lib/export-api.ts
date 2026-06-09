// ============================================================
// Export API — per-dataset CSV downloads + a full ZIP.
// ============================================================
import { api, downloadFile } from "./api";

export interface ExportDataset {
  key: string;
  label: string;
}

export const exportApi = {
  datasets(): Promise<ExportDataset[]> {
    return api.get<ExportDataset[]>("/export/datasets");
  },
  downloadDataset(key: string): Promise<void> {
    return downloadFile(`/export/dataset/${key}`);
  },
  downloadAll(): Promise<void> {
    return downloadFile("/export/all");
  },
};