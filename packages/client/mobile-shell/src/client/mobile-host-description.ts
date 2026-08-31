/** Host facts shown on the mobile connection surfaces after pairing. */

/** Connection-generation home plus the Host default model catalog row. */
export interface HostDescription {
  /** Host account home used to abbreviate displayed filesystem paths. */
  readonly home: string
  /** Default model provider id, when the catalog RPC succeeded. */
  readonly provider?: string
  /** Default model id, when the catalog RPC succeeded. */
  readonly model?: string
}
