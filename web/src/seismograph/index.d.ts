import { DateTime, Duration, Interval } from "luxon";
import "d3-transition";
import { AmplitudeScalable, TimeScalable, MinMaxable } from "./scale";
import { SeismographConfig } from "./seismographconfig";
import { createMarkersForTravelTimes, createMarkerForOriginTime, createFullMarkersForQuakeAtStation, createFullMarkersForQuakeAtChannel, createMarkerForQuakePicks, createMarkerForPicks } from "./seismographmarker";
export { createMarkersForTravelTimes, createMarkerForOriginTime, createFullMarkersForQuakeAtStation, createFullMarkersForQuakeAtChannel, createMarkerForQuakePicks, createMarkerForPicks, };
import type { MarkerType } from "./seismographmarker";
import type { HandlebarsInput } from "./axisutil";
import type { Axis } from "d3-axis";
import type { ScaleLinear, NumberValue as d3NumberValue } from "d3-scale";
import type { Selection } from "d3-selection";
import { SeismogramDisplayData, Seismogram } from "./seismogram";
import { SeisPlotElement } from "./spelement";
import * as axisutil from "./axisutil";
export type BBoxType = {
    height: number;
    width: number;
};
export type MarkerHolderType = {
    marker: MarkerType;
    sdd: SeismogramDisplayData;
    xscale: axisutil.LuxonTimeScale;
    bbox?: BBoxType;
};
export declare const SEISMOGRAPH_ELEMENT = "sp-seismograph";
export declare const seismograph_css = "\n\n:host {\n  display: block;\n  min-height: 50px;\n  height: 100%;\n}\n\ndiv.wrapper {\n  min-height: 50px;\n  height: 100%;\n}\n\n.marker .markerpath {\n  fill: none;\n  stroke: black;\n  stroke-width: 1px;\n}\n\n.marker polygon {\n  fill: rgba(150,220,150,.4);\n}\n\n.marker.predicted polygon {\n  fill: rgba(220,220,220,.4);\n}\n\n.marker.pick polygon {\n  fill: rgba(255,100,100,.4);\n}\n\npath.seispath {\n  stroke: skyblue;\n  fill: none;\n  stroke-width: 1px;\n}\n\npath.orientZ {\n  stroke: seagreen;\n}\n\npath.orientN {\n  stroke: cornflowerblue;\n}\n\npath.orientE {\n  stroke: orange;\n}\n\npath.alignment {\n  stroke-dasharray: 8;\n  stroke-width: 2px;\n}\n\nsvg.seismograph {\n  height: 100%;\n  width: 100%;\n  min-height: 25px;\n  min-width: 25px;\n}\n\nsvg.seismograph g.ySublabel text {\n  font-size: smaller;\n}\n\nsvg.seismograph g.xSublabel text {\n  font-size: smaller;\n}\n\nsvg.seismograph text.title {\n  font-size: larger;\n  font-weight: bold;\n  fill: black;\n  color: black;\n}\n\nsvg.realtimePlot g.allseismograms path.seispath {\n  stroke: skyblue;\n}\n\n/* links in svg */\nsvg.seismograph text a {\n  fill: #0000EE;\n  text-decoration: underline;\n}\n\n";
export declare const COLOR_CSS_ID = "seismographcolors";
export declare class Seismograph extends SeisPlotElement {
    /** @private */
    static _lastID: number;
    plotId: number;
    beforeFirstDraw: boolean;
    /** @private */
    _debugAlignmentSeisData: Array<SeismogramDisplayData>;
    width: number;
    height: number;
    outerWidth: number;
    outerHeight: number;
    svg: Selection<SVGSVGElement, unknown, null, undefined>;
    canvasHolder: null | Selection<SVGForeignObjectElement, unknown, null, undefined>;
    canvas: null | Selection<HTMLCanvasElement, unknown, null, undefined>;
    g: Selection<SVGGElement, unknown, null, undefined>;
    throttleRescale: ReturnType<typeof setTimeout> | null;
    throttleRedraw: ReturnType<typeof requestAnimationFrame> | null;
    time_scalable: SeismographTimeScalable;
    amp_scalable: SeismographAmplitudeScalable;
    _resizeObserver: ResizeObserver;
    minmax_sample_pixels: any;
    constructor(seisData?: SeismogramDisplayData | Array<SeismogramDisplayData>, seisConfig?: SeismographConfig);
    get seisData(): Array<SeismogramDisplayData>;
    set seisData(seisData: Array<SeismogramDisplayData>);
    get seismographConfig(): SeismographConfig;
    set seismographConfig(seismographConfig: SeismographConfig);
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(_name: string, _oldValue: string, _newValue: string): void;
    checkResize(): boolean;
    enableZoom(): void;
    draw(): void;
    printSizes(): void;
    calcDetailForEvent(evt: MouseEvent, _type?: string): SeisMouseEventType;
    isVisible(): boolean;
    drawSeismograms(): void;
    calcScaleAndZoom(): void;
    ampScaleForSeisDisplayData(sdd: SeismogramDisplayData): ScaleLinear<number, number, never>;
    displayTimeRangeForSeisDisplayData(sdd: SeismogramDisplayData): Interval;
    timeScaleForSeisDisplayData(sdd?: SeismogramDisplayData | Interval): axisutil.LuxonTimeScale;
    /**
     * Draws the top, bottom, (time) axis and the left and right (amplitude) axis if configured.
     */
    drawAxis(): void;
    /**
     * Creates amp scale, set range based on height.
     * @private
     * @returns amp scale with range set
     */
    __initAmpScale(): ScaleLinear<number, number, never>;
    ampScaleForAxis(): ScaleLinear<number, number, never>;
    timeScaleForAxis(): ScaleLinear<number, number, never> | axisutil.LuxonTimeScale;
    /**
     * Draws the left and right (amplitude) axis if configured.
     *
     */
    drawTopBottomAxis(): void;
    /**
     * Draws the left and right (amplitude) axis if configured.
     */
    drawLeftRightAxis(): void;
    createLeftRightAxis(): Array<Axis<d3NumberValue> | null>;
    rescaleYAxis(): void;
    createHandlebarsInput(): HandlebarsInput;
    drawAxisLabels(): void;
    resetZoom(): void;
    zoomed(e: any): void;
    redrawWithXScale(): void;
    drawMarkers(): void;
    calcWidthHeight(nOuterWidth: number, nOuterHeight: number): void;
    drawTitle(): void;
    drawXLabel(): void;
    drawXSublabel(): void;
    drawYLabel(): void;
    drawYSublabel(): void;
    /**
     * Update the duration if not already set. This only matters for
     * linedTimeScale currently.
     */
    calcTimeScaleDomain(): void;
    /**
     * Calculate the amplitude range over the current time range, depending
     * on amplitude style.
     *
     * @returns min max over the time range
     */
    calcAmpScaleDomain(): MinMaxable;
    recheckAmpScaleDomain(): void;
    redoDisplayYScale(): void;
    createUnitsLabel(): string;
    getSeismogramData(): Array<SeismogramDisplayData>;
    /**
     * can append single seismogram segment or an array of segments.
     *
     * @param sddList array or single SeismogramDisplayData or Seismogram
     * @private
     */
    _internalAppend(sddList: Array<SeismogramDisplayData> | SeismogramDisplayData | Array<Seismogram> | Seismogram): void;
    /**
     * appends the seismogram(s) or SeismogramDisplayData as separate time series.
     *
     * @param seismogram data to append
     */
    appendSeisData(seismogram: Array<Seismogram> | Array<SeismogramDisplayData> | Seismogram | SeismogramDisplayData): void;
    /**
     * Notification to the element that something about the current seismogram
     * data has changed. This could be that the actual waveform data has been updated
     * or that auxillary data like quake or channel has been added. This should
     * trigger a redraw.
     */
    seisDataUpdated(): void;
    /**
     * Finds the SeismogramDisplayData within the display containing the given
     * Seismogram.
     *
     * @param   seis seismogram to search for
     * @returns       SeismogramDisplayData if found or null if not
     */
    getDisplayDataForSeismogram(seis: Seismogram): SeismogramDisplayData | null;
    /**
     * Removes a seismogram from the display.
     *
     * @param   seisData seis data to remove
     */
    removeSeisData(seisData: SeismogramDisplayData): void;
    /**
     * Removes seismograms that do not overlap the window.
     *
     * @param   timeRange overlap data to keep
     */
    trim(timeRange: Interval): void;
}
export declare class SeismographAmplitudeScalable extends AmplitudeScalable {
    graph: Seismograph;
    drawHalfWidth: number;
    drawMiddle: number;
    constructor(graph: Seismograph);
    notifyAmplitudeChange(middle: number, halfWidth: number): void;
}
export declare const ZERO_DURATION: Duration<true>;
export declare class SeismographTimeScalable extends TimeScalable {
    graph: Seismograph;
    drawAlignmentTimeOffset: Duration;
    drawDuration: Duration;
    constructor(graph: Seismograph, alignmentTimeOffset: Duration, duration: Duration);
    notifyTimeRangeChange(offset: Duration, duration: Duration): void;
}
/**
 * Creates a wrapper for d3 formatter for numbers for axis that keeps typescript happy.
 *
 * @param  formatter simple formatter
 * @returns           function that converts input types
 */
export declare function createNumberFormatWrapper(formatter: (value: number) => string): (nValue: d3NumberValue) => string;
/**
 * Creates a wrapper for d3 formatter for Dates for axis that keeps typescript happy.
 *
 * @param  formatter simple formatter
 * @returns           function that converts input types
 */
export declare function createDateFormatWrapper(formatter: (value: Date) => string): (nValue: Date | d3NumberValue, index: number) => string;
export type SeisMouseEventType = {
    mouseevent: MouseEvent;
    time: DateTime | null;
    relative_time: Duration | null;
    amplitude: number;
    seismograph: Seismograph;
};
