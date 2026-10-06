export interface Command {
  /** Descriptive name of the command (e.g. "Add Tree", "Move House") */
  readonly name: string;
  /** Execute the mutation on the map state */
  execute(): void;
  /** Revert the mutation */
  undo(): void;
}
