export type Brand<T, U> = T & { __brand?: U };

/** The control point X coordinate for the **start** of the curve */
export type CX1 = Brand<number, "X1">;

/** The control point Y coordinate for the **start** of the curve */
export type CY1 = Brand<number, "Y1">;

/** The control point X coordinate for the **end** of the curve */
export type CX2 = Brand<number, "X2">;

/** The control point Y coordinate for the **end** of the curve */
export type CY2 = Brand<number, "Y2">;

/** The X coordinate of the **end** of the curve */
export type X = Brand<number, "X">;

/** The Y coordinate of the **end** of the curve */
export type Y = Brand<number, "Y">;

/** The X coordinate of the **Move** initial command */
export type Mx = Brand<number, "MX">;

/** The Y coordinate of the **Move** initial command */
export type My = Brand<number, "MY">;

export type M_CMD = [Mx, My];
export type C_CMD = [CX1, CY1, CX2, CY2, X, Y];

/**
 * A two dimensional array that represents the path commands `[M, ...C]`
 *
 * - The first command is alway `Move` command represented by 2 numbers `[Mx, My]`
 * - The rest are `Curve` commands represented by 6 numbers `[X1, Y1, X2, Y2, X, Y]`
 */
export type PathCommands = [M_CMD, ...C_CMD[]];

export type CmdIdx = Brand<number, "CMD_IDX">;
export type XcoordIdx = Brand<number, "X_IDX">;
export type PointAddress = [CmdIdx, XcoordIdx];
export type KeyModifiers =
  "Control" | "ControlLeft" | "ControlRight" | "Alt" | "AltLeft" | "AltRight" | "Shift" | "ShiftLeft" | "ShiftRight";
