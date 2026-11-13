// The backend's router type, translated for the tRPC v11 client.
//
// The backend still runs tRPC v10 while this app uses the v11 client. The wire format is
// the same, but v11's types can't read a v10 router, so we rebuild the router's shape here:
// every v10 query/mutation becomes the matching v11 procedure with the same input and
// output, where the output is what actually arrives over JSON (no transformer, so Dates
// become strings).
//
// `@backend/*` is a type-checking-only alias (see tsconfig.app.json): it points at the
// backend checkout next to this one. Type imports are erased by Vite, so the production
// build (which has only this repo) never needs the backend.
import type {
    TRPCBuiltRouter,
    TRPCDefaultErrorShape,
    TRPCMutationProcedure,
    TRPCQueryProcedure,
    inferRouterInputs,
    inferRouterOutputs,
} from '@trpc/server';
import type { AppRouter as BackendRouter } from '@backend/src/router';

// v10 marks "no input" with a unique symbol; v11 expects `void`.
type Input<T> = T extends symbol ? void : T;

// A server value after a JSON round trip. We do this ourselves rather than leave it to
// v11 (transformer: false) because v11's version recurses too deeply on Prisma's Json
// columns (a tournament's prizes) and gives up.
type Jsonify<T> =
    T extends Date ? string
    : T extends string | number | boolean | null | undefined ? T
    : T extends readonly (infer U)[] ? Jsonify<U>[]
    : T extends object ? { [K in keyof T]: Jsonify<T[K]> }
    : T;

type ProcedureTypes<TDef> = TDef extends { _input_in: infer I; _output_out: infer O }
    ? { input: Input<I>; output: Jsonify<O>; meta: object }
    : never;

type Translate<T> =
    T extends { _def: { router: true; record: infer R } } ? TranslateRecord<R>
    : T extends { _type: 'query'; _def: infer D } ? TRPCQueryProcedure<ProcedureTypes<D>>
    : T extends { _type: 'mutation'; _def: infer D } ? TRPCMutationProcedure<ProcedureTypes<D>>
    : never;

type TranslateRecord<R> = { [K in keyof R]: Translate<R[K]> };

export type AppRouter = TRPCBuiltRouter<
    // transformer: true tells v11 the outputs are already in their final (JSON) shape.
    { ctx: object; meta: object; errorShape: TRPCDefaultErrorShape; transformer: true },
    TranslateRecord<BackendRouter['_def']['record']>
>;

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
