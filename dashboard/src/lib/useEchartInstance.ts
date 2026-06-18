import { useEffect, useRef, type RefObject } from "react";
import * as echarts from "echarts/core";
import type { ECharts } from "echarts/core";

export interface UseEchartInstanceOptions {
  /** Join an `echarts.connect` group so axisPointer + tooltip sync across every
   *  chart sharing the id. Read live via a ref, so changing it never re-inits. */
  groupId?: string;
  /** Called once with the instance after init (and with `null` on teardown), so
   *  the page can drive group-wide dataZoom / read the live instance. */
  onReady?: (instance: ECharts | null) => void;
  /** Runs once right after init (post-connect, post-onReady). Use it to attach
   *  instance-scoped handlers (e.g. zrender brush wiring); the returned cleanup
   *  runs once just before `onReady(null)` + `dispose`, preserving the original
   *  single-effect attach/detach ordering. */
  onInit?: (instance: ECharts) => void | (() => void);
}

/**
 * Own the ECharts instance lifecycle for a chart container: a one-time
 * `echarts.init` + optional `echarts.connect(groupId)`, a `ResizeObserver` that
 * resizes the instance, the `onReady(inst)` / `onReady(null)` wiring, and
 * `dispose` on unmount. Returns a ref to the live instance (null before mount /
 * after teardown).
 *
 * The init effect runs once (empty deps); `groupId`, `onReady`, and `onInit`
 * are captured through refs so toggling them never tears the chart down. This is
 * deliberately the *generic* lifecycle only — option pushing (and any
 * notMerge/zoom-preservation/basemap reconciliation) stays in the component, as
 * those differ per chart.
 */
export function useEchartInstance(
  ref: RefObject<HTMLDivElement | null>,
  { groupId, onReady, onInit }: UseEchartInstanceOptions = {},
): RefObject<ECharts | null> {
  const instanceRef = useRef<ECharts | null>(null);
  // Latest values for the once-only effect, so changing any of them mid-life
  // never re-inits the instance.
  const groupIdRef = useRef(groupId);
  groupIdRef.current = groupId;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onInitRef = useRef(onInit);
  onInitRef.current = onInit;

  useEffect(() => {
    if (!ref.current) return;
    const inst = echarts.init(ref.current, undefined, { renderer: "canvas" });
    instanceRef.current = inst;

    if (groupIdRef.current) {
      inst.group = groupIdRef.current;
      echarts.connect(groupIdRef.current);
    }

    onReadyRef.current?.(inst);

    const ro = new ResizeObserver(() => inst.resize());
    ro.observe(ref.current);

    const teardownInit = onInitRef.current?.(inst);

    return () => {
      ro.disconnect();
      teardownInit?.();
      onReadyRef.current?.(null);
      inst.dispose();
      instanceRef.current = null;
    };
  }, []);

  return instanceRef;
}
