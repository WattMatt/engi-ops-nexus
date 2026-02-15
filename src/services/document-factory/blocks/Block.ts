export enum BlockType {
  TEXT = 'TEXT',
  HEADING = 'HEADING',
  IMAGE = 'IMAGE',
  TABLE = 'TABLE',
}

export interface Block {
  type: BlockType;
  content?: string;
  data?: any;
  style?: any;
}
