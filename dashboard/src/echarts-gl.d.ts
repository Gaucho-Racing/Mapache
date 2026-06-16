// echarts-gl 2.x ships no TypeScript types. We only consume its tree-shakeable
// install modules, each of which exports `{ install }` matching the shape
// `echarts.use(...)` expects (an extension registrar). Declared loosely as the
// install signature so the GL imports typecheck without pulling broken upstream
// types.
declare module "echarts-gl/lib/chart/scatter3D/install" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function install(registers: any): void;
}
declare module "echarts-gl/lib/component/grid3D/install" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function install(registers: any): void;
}
