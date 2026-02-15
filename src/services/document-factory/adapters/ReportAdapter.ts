import { Block } from '../blocks/Block';

export interface ReportAdapter {
  transform(data: any): Block[];
}
