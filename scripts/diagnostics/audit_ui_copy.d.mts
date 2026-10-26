export interface UICopyFinding {
  file: string;
  line: number;
  text: string;
}
export function auditUICopy(): UICopyFinding[];
