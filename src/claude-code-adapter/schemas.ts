import { z } from "zod";

const ModelSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

const ContextWindowSchema = z.object({
  context_window_size: z.number(),
  used_percentage: z.number().optional(),
  current_usage: z
    .object({
      input_tokens: z.number(),
      cache_creation_input_tokens: z.number(),
      cache_read_input_tokens: z.number(),
    })
    .optional(),
});

export const StrictStatuslineSchema = z.object({
  transcript_path: z.string(),
  cwd: z.string(),
  model: ModelSchema,
  context_window: ContextWindowSchema,
});

export const LenientStatuslineSchema = z.object({
  transcript_path: z.string().default(""),
  cwd: z.string().default(process.cwd()),
  model: z
    .object({
      id: z.string().default("unknown"),
      display_name: z.string().default("Unknown Model"),
    })
    .default({}),
  context_window: z
    .object({
      context_window_size: z.number().default(200000),
      used_percentage: z.number().optional(),
      current_usage: z
        .object({
          input_tokens: z.number().default(0),
          cache_creation_input_tokens: z.number().default(0),
          cache_read_input_tokens: z.number().default(0),
        })
        .optional(),
    })
    .default({}),
});

const TranscriptMessageContentSchema = z
  .object({
    type: z.string().default("unknown"),
    name: z.string().optional(),
    id: z.string().optional(),
    input: z.record(z.unknown()).optional(),
    content: z.unknown().optional(),
    text: z.string().optional(),
  })
  .passthrough();

const TranscriptMessageSchema = z
  .object({
    model: z.string().optional(),
    role: z.string().optional(),
    usage: z
      .object({
        input_tokens: z.number().optional(),
        output_tokens: z.number().optional(),
        cache_creation_input_tokens: z.number().optional(),
        cache_read_input_tokens: z.number().optional(),
      })
      .optional(),
    content: z.array(TranscriptMessageContentSchema).optional(),
  })
  .passthrough();

export const StrictTranscriptEntrySchema = z
  .object({
    type: z.string(),
    timestamp: z.string(),
    sessionId: z.string(),
    agentId: z.string().optional(),
    slug: z.string().optional(),
    message: TranscriptMessageSchema.optional(),
    data: z
      .object({
        message: z
          .object({
            message: z
              .object({
                model: z.string().optional(),
                usage: z
                  .object({
                    input_tokens: z.number().optional(),
                    output_tokens: z.number().optional(),
                    cache_creation_input_tokens: z.number().optional(),
                    cache_read_input_tokens: z.number().optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export const LenientTranscriptEntrySchema = z
  .object({
    type: z.string().default("unknown"),
    timestamp: z.string().default(new Date().toISOString()),
    sessionId: z.string().default(""),
    agentId: z.string().optional(),
    slug: z.string().optional(),
    message: TranscriptMessageSchema.optional(),
    data: z
      .object({
        message: z
          .object({
            message: z
              .object({
                model: z.string().optional(),
                usage: z
                  .object({
                    input_tokens: z.number().optional(),
                    output_tokens: z.number().optional(),
                    cache_creation_input_tokens: z.number().optional(),
                    cache_read_input_tokens: z.number().optional(),
                  })
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .passthrough();

export type StrictStatusline = z.infer<typeof StrictStatuslineSchema>;
export type LenientStatusline = z.infer<typeof LenientStatuslineSchema>;
export type StrictTranscriptEntry = z.infer<typeof StrictTranscriptEntrySchema>;
export type LenientTranscriptEntry = z.infer<
  typeof LenientTranscriptEntrySchema
>;
