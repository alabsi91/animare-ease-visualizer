import type { C_CMD, M_CMD, PathCommands, PointAddress, X, Y } from "./types";

export class Points {
  #cmds: PathCommands = [
    [0, 1],
    [0.5, 0.5, 0.5, 0.5, 1, 0],
  ];

  readonly events = {
    /** Should be fired when points value are updated only */
    onUpdate: new PointEvent(),
    /** Fired just before a command is removed */
    onDelete: new PointEvent<(cmdIdx: number) => void>(),
    /** Fired when a new command is added */
    onAdd: new PointEvent<(cmdIdx: number) => void>(),
  };

  get length() {
    return this.#cmds.length;
  }

  get value() {
    return this.#cmds;
  }

  get valueCopy() {
    return Points.copy(this.#cmds);
  }

  get valueStr() {
    return Points.constructPathStr(this.#cmds);
  }

  constructor(pathCommandsArr?: PathCommands | string) {
    if (!pathCommandsArr) return;
    if (typeof pathCommandsArr === "string") {
      pathCommandsArr = Points.parsePathStr(pathCommandsArr);
    }
    this.#cmds = pathCommandsArr;
  }

  /** Scale all points by a factor (returns a new array does not mutate) */
  static scale(pathCommands: PathCommands, factor: number) {
    const result: number[][] = [];

    for (let i = 0; i < pathCommands.length; i++) {
      const cmd = pathCommands[i];
      result.push([]);

      for (let j = 0; j < cmd.length; j++) {
        result[i][j] = cmd[j] * factor;
      }
    }

    return result as PathCommands;
  }

  /** Scale all points by a factor (returns a new array does not mutate) */
  scale(factor: number) {
    return Points.scale(this.#cmds, factor);
  }

  /** Set a new value without mutating the array reference */
  set(newPathCommands: PathCommands) {
    newPathCommands = Points.copy(newPathCommands);
    this.#cmds.length = 0;
    this.#cmds.push(...newPathCommands);
  }

  /** Set a new value from a path string */
  setFromStr(path: string) {
    this.set(Points.parsePathStr(path));
  }

  /** Get a command by index */
  getCmd(cmdIdx: number) {
    return this.#cmds[cmdIdx];
  }

  /** Set a command by index */
  setCmd(cmdIdx: number, cmd: C_CMD | M_CMD) {
    this.#cmds[cmdIdx] = cmd;
  }

  /** Remove a command by index */
  removeCmd(cmdIdx: number) {
    this.events.onDelete.fire(cmdIdx);
    this.#cmds.splice(cmdIdx, 1);
  }

  /** Add a command by index */
  addCmd(cmdIdx: number, cmd: C_CMD) {
    this.#cmds.splice(cmdIdx, 0, cmd);
    this.events.onAdd.fire(cmdIdx);
  }

  /** Remove all commands */
  empty() {
    this.#cmds.length = 0;
  }

  /** The anchor point coordinates is the last x,y in the command */
  getAnchorCoordinates(cmdIdx: number): [X, Y] {
    const cmd = this.#cmds[cmdIdx];
    const x = cmd[cmd.length - 2] as X;
    const y = cmd[cmd.length - 1] as Y;
    return [x, y];
  }

  /** Get `x, y` using a point address */
  getPoint([cmdIdx, pointIdx]: PointAddress): [number, number] {
    const x = this.#cmds[cmdIdx][pointIdx];
    const y = this.#cmds[cmdIdx][pointIdx + 1];
    return [x, y];
  }

  /** Set `x, y` using a point address */
  setPoint([cmdIdx, pointIdx]: PointAddress, [x, y]: [number, number]) {
    this.#cmds[cmdIdx][pointIdx] = x;
    this.#cmds[cmdIdx][pointIdx + 1] = y;
  }

  /** Get `x` using a point address */
  getPointX([cmdIdx, pointIdx]: PointAddress): number {
    return this.#cmds[cmdIdx][pointIdx];
  }

  /** Set `x` using a point address */
  setPointX([cmdIdx, pointIdx]: PointAddress, x: number) {
    this.#cmds[cmdIdx][pointIdx] = x;
  }

  /** Get `y` using a point address */
  getPointY([cmdIdx, pointIdx]: PointAddress): number {
    return this.#cmds[cmdIdx][pointIdx + 1];
  }

  /** Set `y` using a point address */
  setPointY([cmdIdx, pointIdx]: PointAddress, y: number) {
    this.#cmds[cmdIdx][pointIdx + 1] = y;
  }

  /** Convert a path string to points */
  static parsePathStr(path: string): PathCommands {
    const result = [];

    const commands = path.split(/[MC]/gi).filter(Boolean);
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const numArr = command.split(" ").filter(Boolean).map(parseFloat);
      if (i === 0 && numArr.length > 2) console.error("Invalid path: first command must be `Move`");
      result.push(numArr);
    }

    return result as PathCommands;
  }

  /** Construct the path d attribute from points */
  static constructPathStr(pathCommands: PathCommands): string {
    let result = "";
    for (let i = 0; i < pathCommands.length; i++) {
      const cmd = pathCommands[i];
      if (i === 0) {
        const [x, y] = cmd as M_CMD;
        result += `M ${+x.toFixed(3)} ${+y.toFixed(3)}`;
        continue;
      }

      const [x1, y1, x2, y2, x, y] = cmd as C_CMD;
      result += ` C ${+x1.toFixed(3)} ${+y1.toFixed(3)} ${+x2.toFixed(3)} ${+y2.toFixed(3)} ${+x.toFixed(3)} ${+y.toFixed(3)}`;
    }

    return result;
  }

  static copy(pathCommands: PathCommands): PathCommands {
    return pathCommands.map(cmd => [...cmd]) as PathCommands;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class PointEvent<T extends (...args: any[]) => any = () => void> {
  #events: T[] = [];

  add = (cb: T, signal?: AbortSignal) => {
    this.#events.push(cb);
    if (signal) signal.addEventListener("abort", () => this.remove(cb), { once: true });
  };

  remove = (cb: T) => {
    this.#events = this.#events.filter(eventCB => eventCB !== cb);
  };

  fire = (...args: Parameters<T>) => {
    this.#events.forEach(cb => cb(...args));
  };
}
