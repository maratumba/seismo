"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeismographTimeScalable = exports.ZERO_DURATION = exports.SeismographAmplitudeScalable = exports.Seismograph = exports.COLOR_CSS_ID = exports.seismograph_css = exports.SEISMOGRAPH_ELEMENT = exports.createMarkerForPicks = exports.createMarkerForQuakePicks = exports.createFullMarkersForQuakeAtChannel = exports.createFullMarkersForQuakeAtStation = exports.createMarkerForOriginTime = exports.createMarkersForTravelTimes = void 0;
exports.createNumberFormatWrapper = createNumberFormatWrapper;
exports.createDateFormatWrapper = createDateFormatWrapper;
/*
 * Philip Crotwell
 * University of South Carolina, 2019
 * https://www.seis.sc.edu
 */
const luxon_1 = require("luxon");
const d3_selection_1 = require("d3-selection");
require("d3-transition");
const d3_scale_1 = require("d3-scale");
const d3_axis_1 = require("d3-axis");
const d3_zoom_1 = require("d3-zoom");
const cssutil_1 = require("./cssutil");
const scale_1 = require("./scale");
const seismographconfig_1 = require("./seismographconfig");
const seismographmarker_1 = require("./seismographmarker");
Object.defineProperty(exports, "createMarkersForTravelTimes", { enumerable: true, get: function () { return seismographmarker_1.createMarkersForTravelTimes; } });
Object.defineProperty(exports, "createMarkerForOriginTime", { enumerable: true, get: function () { return seismographmarker_1.createMarkerForOriginTime; } });
Object.defineProperty(exports, "createFullMarkersForQuakeAtStation", { enumerable: true, get: function () { return seismographmarker_1.createFullMarkersForQuakeAtStation; } });
Object.defineProperty(exports, "createFullMarkersForQuakeAtChannel", { enumerable: true, get: function () { return seismographmarker_1.createFullMarkersForQuakeAtChannel; } });
Object.defineProperty(exports, "createMarkerForQuakePicks", { enumerable: true, get: function () { return seismographmarker_1.createMarkerForQuakePicks; } });
Object.defineProperty(exports, "createMarkerForPicks", { enumerable: true, get: function () { return seismographmarker_1.createMarkerForPicks; } });
const seismographutil_1 = require("./seismographutil");
const util_1 = require("./util");
const seismogram_1 = require("./seismogram");
const spelement_1 = require("./spelement");
const axisutil = __importStar(require("./axisutil"));
const util = __importStar(require("./util")); // for util.log to replace console.log
const util_2 = require("./util");
const handlebarshelpers_1 = require("./handlebarshelpers");
(0, handlebarshelpers_1.registerHelpers)();
const CLIP_PREFIX = "seismographclip";
exports.SEISMOGRAPH_ELEMENT = "sp-seismograph";
exports.seismograph_css = `

:host {
  display: block;
  min-height: 50px;
  height: 100%;
}

div.wrapper {
  min-height: 50px;
  height: 100%;
}

.marker .markerpath {
  fill: none;
  stroke: black;
  stroke-width: 1px;
}

.marker polygon {
  fill: rgba(150,220,150,.4);
}

.marker.predicted polygon {
  fill: rgba(220,220,220,.4);
}

.marker.pick polygon {
  fill: rgba(255,100,100,.4);
}

path.seispath {
  stroke: skyblue;
  fill: none;
  stroke-width: 1px;
}

path.orientZ {
  stroke: seagreen;
}

path.orientN {
  stroke: cornflowerblue;
}

path.orientE {
  stroke: orange;
}

path.alignment {
  stroke-dasharray: 8;
  stroke-width: 2px;
}

svg.seismograph {
  height: 100%;
  width: 100%;
  min-height: 25px;
  min-width: 25px;
}

svg.seismograph g.ySublabel text {
  font-size: smaller;
}

svg.seismograph g.xSublabel text {
  font-size: smaller;
}

svg.seismograph text.title {
  font-size: larger;
  font-weight: bold;
  fill: black;
  color: black;
}

svg.realtimePlot g.allseismograms path.seispath {
  stroke: skyblue;
}

/* links in svg */
svg.seismograph text a {
  fill: #0000EE;
  text-decoration: underline;
}

`;
exports.COLOR_CSS_ID = "seismographcolors";
/* A seismogram plot, using d3. The actual waveform can be drawn
 * with a separate Canvas (default) or with SVG.
 * Note that for SVG you must have
 * stroke and fill set in css like:<br>
 * path.seispath {
 *   stroke: skyblue;
 *   fill: none;
 * }<br/>
 * in order to have the seismogram display.
 */
class Seismograph extends spelement_1.SeisPlotElement {
    /** @private */
    static _lastID;
    plotId;
    beforeFirstDraw;
    /** @private */
    _debugAlignmentSeisData;
    width;
    height;
    outerWidth;
    outerHeight;
    svg;
    canvasHolder;
    canvas;
    g;
    throttleRescale;
    throttleRedraw;
    time_scalable;
    amp_scalable;
    _resizeObserver;
    minmax_sample_pixels = seismographutil_1.DEFAULT_MAX_SAMPLE_PER_PIXEL;
    constructor(seisData, seisConfig) {
        super(seisData, seisConfig);
        this.outerWidth = -1;
        this.outerHeight = -1;
        this.throttleRescale = null;
        this.throttleRedraw = null;
        this.plotId = ++Seismograph._lastID;
        this.beforeFirstDraw = true;
        this._debugAlignmentSeisData = [];
        this.width = 200;
        this.height = 100;
        const wrapper = document.createElement("div");
        wrapper.setAttribute("class", "wrapper");
        this.addStyle(exports.seismograph_css);
        const lineColorsCSS = this.seismographConfig.createCSSForLineColors();
        this.addStyle(lineColorsCSS, exports.COLOR_CSS_ID);
        this.getShadowRoot().appendChild(wrapper);
        this.canvas = null;
        this.canvasHolder = null;
        this.svg = (0, d3_selection_1.select)(wrapper).append("svg").style("z-index", 100);
        const svgNode = this.svg.node();
        if (svgNode != null) {
            wrapper.appendChild(svgNode);
        }
        if ((0, util_2.isDef)(this.seismographConfig.minHeight) &&
            (0, util_2.isNumArg)(this.seismographConfig.minHeight) &&
            this.seismographConfig.minHeight > 0) {
            const minHeight = this.seismographConfig.minHeight;
            this.svg.style("min-height", minHeight + "px");
        }
        if ((0, util_2.isNumArg)(this.seismographConfig.maxHeight) &&
            this.seismographConfig.maxHeight > 0) {
            this.svg.style("max-height", this.seismographConfig.maxHeight + "px");
        }
        if ((0, util_2.isNumArg)(this.seismographConfig.minWidth) &&
            this.seismographConfig.minWidth > 0) {
            const minWidth = this.seismographConfig.minWidth;
            this.svg.style("min-width", minWidth + "px");
        }
        if ((0, util_2.isNumArg)(this.seismographConfig.maxWidth) &&
            this.seismographConfig.maxWidth > 0) {
            this.svg.style("max-width", this.seismographConfig.maxWidth + "px");
        }
        this.svg.classed("seismograph", true);
        this.svg.classed(cssutil_1.AUTO_COLOR_SELECTOR, true);
        this.svg.attr("plotId", this.plotId);
        const alignmentTimeOffset = luxon_1.Duration.fromMillis(0);
        let maxDuration = luxon_1.Duration.fromMillis(0);
        maxDuration = (0, seismogram_1.findMaxDuration)(this.seisData);
        this.time_scalable = new SeismographTimeScalable(this, alignmentTimeOffset, maxDuration);
        if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
            this.seismographConfig.linkedTimeScale.link(this.time_scalable);
        }
        this.calcTimeScaleDomain();
        this.amp_scalable = new SeismographAmplitudeScalable(this);
        if (this.seismographConfig.linkedAmplitudeScale) {
            this.seismographConfig.linkedAmplitudeScale.link(this.amp_scalable);
        }
        this.redoDisplayYScale();
        this.g = this.svg
            .append("g")
            .classed("marginTransform", true)
            .attr("transform", "translate(" +
            this.seismographConfig.margin.left +
            "," +
            this.seismographConfig.margin.top +
            ")");
        this.g
            .append("g")
            .classed("allseismograms", true)
            .classed(cssutil_1.AUTO_COLOR_SELECTOR, true);
        if (!this.seismographConfig.fixedTimeScale) {
            this.enableZoom();
        }
        // create marker g
        this.g
            .append("g")
            .attr("class", "allmarkers")
            .attr("style", "clip-path: url(#" + CLIP_PREFIX + this.plotId + ")");
        // set up to redraw if size changes
        this._resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.target instanceof Seismograph) {
                    const graph = entry.target;
                    const rect = entry.contentRect;
                    if (!graph.beforeFirstDraw &&
                        (rect.width !== graph.outerWidth ||
                            rect.height !== graph.outerHeight)) {
                        graph.redraw();
                    }
                }
            }
        });
        this._resizeObserver.observe(this);
        // event listener to transform mouse click into time
        this.addEventListener("click", (evt) => {
            const detail = this.calcDetailForEvent(evt, "click");
            const event = new CustomEvent("seisclick", { detail: detail });
            this.dispatchEvent(event);
        });
        this.addEventListener("mousemove", (evt) => {
            const detail = this.calcDetailForEvent(evt, "mousemove");
            const event = new CustomEvent("seismousemove", { detail: detail });
            this.dispatchEvent(event);
        });
    }
    get seisData() {
        return super.seisData;
    }
    set seisData(seisData) {
        this._seisDataList = [];
        this.appendSeisData(seisData);
    }
    get seismographConfig() {
        return super.seismographConfig;
    }
    set seismographConfig(seismographConfig) {
        if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
            this.seismographConfig.linkedTimeScale.unlink(this.time_scalable);
        }
        if (this.seismographConfig.linkedAmplitudeScale) {
            this.seismographConfig.linkedAmplitudeScale.unlink(this.amp_scalable);
        }
        super.seismographConfig = seismographConfig;
        if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
            this.seismographConfig.linkedTimeScale.link(this.time_scalable);
        }
        if (this.seismographConfig.linkedAmplitudeScale) {
            this.seismographConfig.linkedAmplitudeScale.link(this.amp_scalable);
        }
        this.enableZoom();
        this.redraw();
    }
    connectedCallback() {
        this.redraw();
    }
    disconnectedCallback() {
        if (this.seismographConfig.linkedAmplitudeScale) {
            this.seismographConfig.linkedAmplitudeScale.unlink(this.amp_scalable);
        }
        if (this.seismographConfig.linkedTimeScale) {
            this.seismographConfig.linkedTimeScale.unlink(this.time_scalable);
        }
    }
    attributeChangedCallback(_name, _oldValue, _newValue) {
        this.redraw();
    }
    checkResize() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        const rect = svgEl.getBoundingClientRect();
        if (rect.width !== this.outerWidth || rect.height !== this.outerHeight) {
            return true;
        }
        return false;
    }
    enableZoom() {
        const mythis = this;
        const z = this.svg.call(
        // @ts-expect-error typescript and d3 don't always place nice together
        (0, d3_zoom_1.zoom)().on("zoom", function (e) {
            mythis.zoomed(e);
        }));
        if (!this.seismographConfig.wheelZoom) {
            z.on("wheel.zoom", null);
        }
    }
    draw() {
        if (!this.isConnected) {
            return;
        }
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        const rect = svgEl.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
            util.log(`Attempt draw seismograph, but width/height too small: ${rect.width} ${rect.height}`);
            return;
        }
        let calcHeight = rect.height;
        if (rect.width !== this.outerWidth || rect.height !== this.outerHeight) {
            if ((0, util_2.isNumArg)(this.seismographConfig.minHeight) &&
                calcHeight < this.seismographConfig.minHeight) {
                calcHeight = this.seismographConfig.minHeight;
            }
            if ((0, util_2.isNumArg)(this.seismographConfig.maxHeight) &&
                calcHeight > this.seismographConfig.maxHeight) {
                calcHeight = this.seismographConfig.maxHeight;
            }
        }
        this.calcWidthHeight(rect.width, calcHeight);
        this.g.attr("transform", `translate(${this.seismographConfig.margin.left}, ${this.seismographConfig.margin.top} )`);
        if (this.canvas && this.canvasHolder) {
            this.canvasHolder.attr("width", this.width).attr("height", this.height);
            this.canvasHolder.attr("x", this.seismographConfig.margin.left);
            this.canvasHolder.attr("y", this.seismographConfig.margin.top);
            this.canvas.attr("width", this.width).attr("height", this.height);
        }
        else {
            const svg = (0, d3_selection_1.select)(svgEl);
            this.canvasHolder = svg
                .insert("foreignObject", ":first-child")
                .classed("seismograph", true)
                .attr("x", this.seismographConfig.margin.left)
                .attr("y", this.seismographConfig.margin.top)
                .attr("width", this.width)
                .attr("height", this.height);
            if (this.canvasHolder == null) {
                throw new Error("canvasHolder is null");
            }
            const c = this.canvasHolder
                .append("xhtml:canvas")
                .classed("seismograph", true)
                .attr("xmlns", util_1.XHTML_NS)
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", this.width)
                .attr("height", this.height);
            this.canvas = c;
        }
        this.drawSeismograms();
        this.drawAxis();
        const unitsLabel = this.seismographConfig.ySublabelIsUnits
            ? this.createUnitsLabel()
            : "";
        axisutil.drawAxisLabels(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput(), unitsLabel);
        if (this.seismographConfig.doMarkers) {
            this.drawMarkers();
        }
        this.beforeFirstDraw = false;
    }
    printSizes() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        let out = "";
        const rect = svgEl.getBoundingClientRect();
        out += "svg rect.height " + rect.height + "\n";
        out += "svg rect.width " + rect.width + "\n";
        const grect = this.getBoundingClientRect();
        out += "parent rect.height " + grect.height + "\n";
        out += "parent rect.width " + grect.width + "\n";
        const cnode = this.canvas?.node();
        const crect = cnode?.getBoundingClientRect();
        if (this.canvas && cnode && crect) {
            out += "c rect.height " + crect.height + "\n";
            out += "c rect.width " + crect.width + "\n";
            out += "c style.height " + this.canvas.style("height") + "\n";
            out += "c style.width " + this.canvas.style("width") + "\n";
            out += "this.height " + this.height + "\n";
            out += "this.width " + this.width + "\n";
            out += "canvas.height " + cnode.height + "\n";
            out += "canvas.width " + cnode.width + "\n";
            out += "this.outerHeight " + this.outerHeight + "\n";
            out += "this.outerWidth " + this.outerWidth + "\n";
            const m = this.seismographConfig.margin;
            out += m ? `this.margin ${String(m)}\n` : `this.margin null\n`;
        }
        else {
            out += "crect bounding rect is null\n";
        }
        util.log(out);
    }
    calcDetailForEvent(evt, _type) {
        const margin = this.seismographConfig.margin;
        const mouseTimeVal = this.timeScaleForAxis().invert(evt.offsetX - margin.left);
        const mouseAmp = this.ampScaleForAxis().invert(evt.offsetY - margin.top);
        const out = {
            mouseevent: evt,
            time: null,
            relative_time: null,
            amplitude: mouseAmp,
            seismograph: this,
        };
        if (mouseTimeVal instanceof luxon_1.DateTime) {
            out.time = mouseTimeVal;
        }
        else {
            // relative time in seconds
            out.relative_time = luxon_1.Duration.fromMillis(mouseTimeVal * 1000);
        }
        return out;
    }
    isVisible() {
        const elem = this.canvas?.node();
        if (!elem) {
            return false;
        }
        return !!(elem.offsetWidth ||
            elem.offsetHeight ||
            elem.getClientRects().length);
    }
    drawSeismograms() {
        if (!this.isVisible()) {
            // no need to draw if we are not visible
            return;
        }
        const canvas = this.canvas?.node();
        if (!canvas) {
            return;
        }
        (0, seismographutil_1.clearCanvas)(canvas);
        if (this.seismographConfig.xGridLines) {
            (0, seismographutil_1.drawXScaleGridLines)(canvas, this.timeScaleForAxis(), this.seismographConfig.gridLineColor);
        }
        if (this.seismographConfig.yGridLines) {
            (0, seismographutil_1.drawYScaleGridLines)(canvas, this.ampScaleForAxis(), this.seismographConfig.gridLineColor);
        }
        (0, seismographutil_1.drawAllOnCanvas)(canvas, this._seisDataList, this._seisDataList.map((sdd) => this.timeScaleForSeisDisplayData(sdd)), this._seisDataList.map((sdd) => this.ampScaleForSeisDisplayData(sdd)), this._seisDataList.map((_sdd, ti) => this.seismographConfig.getColorForIndex(ti)), this.seismographConfig.lineWidth, this.seismographConfig.connectSegments, this.minmax_sample_pixels);
    }
    calcScaleAndZoom() {
        this.rescaleYAxis();
        // check if clip exists, wonky d3 convention
        const container = this.svg
            .select("defs")
            .select("#" + CLIP_PREFIX + this.plotId);
        if (container.empty()) {
            this.svg
                .append("defs")
                .append("clipPath")
                .attr("id", CLIP_PREFIX + this.plotId);
        }
        const clip = this.svg
            .select("defs")
            .select("#" + CLIP_PREFIX + this.plotId);
        clip.selectAll("rect").remove();
        clip.append("rect").attr("width", this.width).attr("height", this.height);
    }
    ampScaleForSeisDisplayData(sdd) {
        const ampScale = this.__initAmpScale();
        if (this.seismographConfig.linkedAmplitudeScale) {
            const drawHalfWidth = this.amp_scalable.drawHalfWidth;
            let sensitivityVal = 1;
            if (this.seismographConfig.doGain &&
                sdd.seismogram?.isYUnitCount() &&
                sdd.sensitivity?.sensitivity) {
                sensitivityVal = sdd.sensitivity.sensitivity;
            }
            if (!this.seismographConfig.isCenteredAmp()) {
                return ampScale.domain([
                    (this.amp_scalable.drawMiddle - drawHalfWidth) * sensitivityVal,
                    (this.amp_scalable.drawMiddle + drawHalfWidth) * sensitivityVal,
                ]);
            }
            const sddInterval = this.displayTimeRangeForSeisDisplayData(sdd);
            const minMax = (0, seismogram_1.calcMinMax)(sdd, sddInterval, false, this.seismographConfig.amplitudeMode);
            if (minMax) {
                // if doGain, halfWidth is in real world units, so mul sensitivity to
                // get counts for drawing
                const myMin = minMax.middle - drawHalfWidth * sensitivityVal;
                const myMax = minMax.middle + drawHalfWidth * sensitivityVal;
                ampScale.domain([myMin, myMax]);
            }
            else {
                // no data?
                ampScale.domain([-1, 1]);
            }
        }
        else if (this.seismographConfig.fixedAmplitudeScale) {
            ampScale.domain(this.seismographConfig.fixedAmplitudeScale);
        }
        else {
            throw new Error("ampScaleForSeisDisplayData Must be either linked or fixed amp scale");
        }
        return ampScale;
    }
    displayTimeRangeForSeisDisplayData(sdd) {
        let plotInterval;
        if (this.seismographConfig.linkedTimeScale) {
            if (this.time_scalable.drawDuration.equals(exports.ZERO_DURATION)) {
                this.seismographConfig.linkedTimeScale.recalculate().catch((m) => {
                    // eslint-disable-next-line no-console
                    console.warn(`problem recalc displayTimeRangeForSeisDisplayData: ${m}`);
                });
            }
            // drawDuration should be set via recalculate now
            const startOffset = this.time_scalable.drawAlignmentTimeOffset;
            const duration = this.time_scalable.drawDuration;
            plotInterval = sdd.relativeTimeWindow(startOffset, duration);
        }
        else if (this.seismographConfig.fixedTimeScale) {
            plotInterval = this.seismographConfig.fixedTimeScale;
        }
        else {
            throw new Error("Must be either fixed or linked time scale");
        }
        return plotInterval;
    }
    timeScaleForSeisDisplayData(sdd) {
        let plotInterval;
        if (sdd) {
            if (sdd instanceof seismogram_1.SeismogramDisplayData) {
                plotInterval = this.displayTimeRangeForSeisDisplayData(sdd);
            }
            else {
                plotInterval = sdd;
            }
        }
        else {
            if (this.seismographConfig.linkedTimeScale) {
                plotInterval = util.durationEnd(this.seismographConfig.linkedTimeScale.duration, luxon_1.DateTime.utc());
            }
            else if (this.seismographConfig.fixedTimeScale) {
                plotInterval = this.seismographConfig.fixedTimeScale;
            }
            else {
                // ??? should not happen, just use now and 1 sec?
                plotInterval = util.durationEnd(1, luxon_1.DateTime.utc());
            }
        }
        return new axisutil.LuxonTimeScale(plotInterval, [0, this.width]);
    }
    /**
     * Draws the top, bottom, (time) axis and the left and right (amplitude) axis if configured.
     */
    drawAxis() {
        this.drawTopBottomAxis();
        this.drawLeftRightAxis();
    }
    /**
     * Creates amp scale, set range based on height.
     * @private
     * @returns amp scale with range set
     */
    __initAmpScale() {
        const ampAxisScale = (0, d3_scale_1.scaleLinear)();
        // don't use top,bot pixel, somehow line at top amp disappears if [this.height, 0]
        ampAxisScale.range([this.height - 1, 1]);
        return ampAxisScale;
    }
    ampScaleForAxis() {
        const ampAxisScale = this.__initAmpScale();
        if (this.seismographConfig.fixedAmplitudeScale) {
            ampAxisScale.domain(this.seismographConfig.fixedAmplitudeScale);
        }
        else if (this.seismographConfig.linkedAmplitudeScale) {
            let middle = this.amp_scalable.drawMiddle;
            if (this.seismographConfig.isCenteredAmp()) {
                middle = 0;
            }
            else {
                middle = this.amp_scalable.drawMiddle;
            }
            ampAxisScale.domain([
                middle - this.amp_scalable.drawHalfWidth,
                middle + this.amp_scalable.drawHalfWidth,
            ]);
        }
        else {
            throw new Error("ampScaleForAxis Must be either linked or fixed amp scale");
        }
        return ampAxisScale;
    }
    timeScaleForAxis() {
        let xScaleToDraw;
        if (this.seismographConfig.isRelativeTime) {
            xScaleToDraw = (0, d3_scale_1.scaleLinear)();
            xScaleToDraw.range([0, this.width]);
            if (this.seismographConfig.linkedTimeScale) {
                const startOffset = this.time_scalable.drawAlignmentTimeOffset.toMillis() / 1000;
                const duration = this.time_scalable.drawDuration.toMillis() / 1000;
                if (duration > 0) {
                    xScaleToDraw.domain([startOffset, startOffset + duration]);
                }
                else {
                    xScaleToDraw.domain([startOffset + duration, startOffset]);
                }
            }
            else if (this.seismographConfig.fixedTimeScale) {
                const psed = this.seismographConfig.fixedTimeScale;
                const s = (0, util_2.validStartTime)(psed);
                const e = (0, util_2.validEndTime)(psed);
                xScaleToDraw.domain([s.toMillis() / 1000, e.toMillis() / 1000]);
            }
            else {
                throw new Error("neither fixed nor linked time scale");
            }
        }
        else {
            if (this.seismographConfig.linkedTimeScale) {
                if (this.seisData.length > 0) {
                    xScaleToDraw = this.timeScaleForSeisDisplayData(this.seisData[0]);
                }
                else {
                    xScaleToDraw = this.timeScaleForSeisDisplayData(); // empty uses duration and now
                }
            }
            else if (this.seismographConfig.fixedTimeScale) {
                const psed = this.seismographConfig.fixedTimeScale;
                xScaleToDraw = this.timeScaleForSeisDisplayData(psed);
            }
            else {
                throw new Error("neither fixed nor linked time scale");
            }
        }
        return xScaleToDraw;
    }
    /**
     * Draws the left and right (amplitude) axis if configured.
     *
     */
    drawTopBottomAxis() {
        this.g.selectAll("g.axis--x").remove();
        this.g.selectAll("g.axis--x-top").remove();
        let xScaleToDraw = this.timeScaleForAxis();
        if (this.seismographConfig.isRelativeTime) {
            // eg xScaleToDraw is ScaleLinear
            xScaleToDraw = xScaleToDraw;
            if (this.seismographConfig.isXAxis) {
                const xAxis = (0, d3_axis_1.axisBottom)(xScaleToDraw);
                xAxis.tickFormat(createNumberFormatWrapper(this.seismographConfig.relativeTimeFormat));
                this.g
                    .append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + this.height + ")")
                    .call(xAxis);
            }
            if (this.seismographConfig.isXAxisTop) {
                const xAxisTop = (0, d3_axis_1.axisTop)(xScaleToDraw);
                xAxisTop.tickFormat(createNumberFormatWrapper(this.seismographConfig.relativeTimeFormat));
                this.g.append("g").attr("class", "axis axis--x-top").call(xAxisTop);
            }
        }
        else {
            xScaleToDraw = xScaleToDraw;
            if (this.seismographConfig.isXAxis) {
                const xAxis = (0, d3_axis_1.axisBottom)(xScaleToDraw.d3scale);
                xAxis.tickFormat(createDateFormatWrapper(this.seismographConfig.timeFormat));
                this.g
                    .append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + this.height + ")")
                    .call(xAxis);
            }
            if (this.seismographConfig.isXAxisTop) {
                const xAxisTop = (0, d3_axis_1.axisTop)(xScaleToDraw.d3scale);
                xAxisTop.tickFormat(createDateFormatWrapper(this.seismographConfig.timeFormat));
                this.g.append("g").attr("class", "axis axis--x-top").call(xAxisTop);
            }
        }
    }
    /**
     * Draws the left and right (amplitude) axis if configured.
     */
    drawLeftRightAxis() {
        this.g.selectAll("g.axis--y").remove();
        this.g.selectAll("g.axis--y-right").remove();
        const [yAxis, yAxisRight] = this.createLeftRightAxis();
        if ((0, util_2.isDef)(yAxis)) {
            this.g.append("g").attr("class", "axis axis--y").call(yAxis);
        }
        if ((0, util_2.isDef)(yAxisRight)) {
            this.g
                .append("g")
                .attr("class", "axis axis--y-right")
                .attr("transform", "translate(" + this.width + ",0)")
                .call(yAxisRight);
        }
    }
    createLeftRightAxis() {
        let yAxis = null;
        let yAxisRight = null;
        const axisScale = this.ampScaleForAxis();
        if (this.seismographConfig.isYAxis) {
            yAxis = (0, d3_axis_1.axisLeft)(axisScale).tickFormat((0, seismographconfig_1.numberFormatWrapper)(this.seismographConfig.amplitudeFormat));
            yAxis.scale(axisScale);
            yAxis.ticks(8, this.seismographConfig.amplitudeFormat);
        }
        if (this.seismographConfig.isYAxisRight) {
            yAxisRight = (0, d3_axis_1.axisRight)(axisScale).tickFormat((0, seismographconfig_1.numberFormatWrapper)(this.seismographConfig.amplitudeFormat));
            yAxisRight.scale(axisScale);
            yAxisRight.ticks(8, this.seismographConfig.amplitudeFormat);
        }
        return [yAxis, yAxisRight];
    }
    rescaleYAxis() {
        if (!this.beforeFirstDraw) {
            const delay = 500;
            if (this.throttleRescale) {
                clearTimeout(this.throttleRescale);
            }
            this.throttleRescale = setTimeout(() => {
                const [yAxis, yAxisRight] = this.createLeftRightAxis();
                if (yAxis) {
                    this.g
                        .select(".axis--y")
                        .transition()
                        .duration(delay / 2)
                        // @ts-expect-error typescript and d3 dont always play well together
                        .call(yAxis);
                }
                if (yAxisRight) {
                    this.g
                        .select(".axis--y-right")
                        .transition()
                        .duration(delay / 2)
                        // @ts-expect-error typescript and d3 dont always play well together
                        .call(yAxisRight);
                }
                this.throttleRescale = null;
            }, delay);
        }
    }
    createHandlebarsInput() {
        return {
            seisDataList: this._seisDataList,
            seisConfig: this._seismographConfig,
        };
    }
    drawAxisLabels() {
        this.drawTitle();
        this.drawXLabel();
        this.drawXSublabel();
        this.drawYLabel();
        this.drawYSublabel();
    }
    resetZoom() {
        if (this.seismographConfig.linkedTimeScale) {
            this.seismographConfig.linkedTimeScale.unzoom();
        }
        else {
            throw new Error("can't reset zoom for fixedTimeScale");
        }
    }
    zoomed(e) {
        const t = e.transform;
        if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
            const linkedTS = this.seismographConfig.linkedTimeScale;
            const origOffset = linkedTS.origOffset.toMillis() / 1000;
            const origDuration = linkedTS.origDuration.toMillis() / 1000;
            const origXScale = (0, d3_scale_1.scaleLinear)();
            origXScale.range([0, this.width]);
            if (origDuration > 0) {
                origXScale.domain([origOffset, origOffset + origDuration]);
            }
            else {
                origXScale.domain([origOffset + origDuration, origOffset]);
            }
            const xt = t.rescaleX(origXScale);
            const startDelta = xt.domain()[0].valueOf() - origXScale.domain()[0].valueOf();
            const duration = xt.domain()[1] - xt.domain()[0];
            linkedTS.zoom(luxon_1.Duration.fromMillis(startDelta * 1000), luxon_1.Duration.fromMillis(duration * 1000));
        }
        else {
            throw new Error("can't zoom fixedTimeScale");
        }
    }
    redrawWithXScale() {
        const mythis = this;
        if (!this.beforeFirstDraw) {
            this.g.select("g.allseismograms").selectAll("g.seismogram").remove();
            if (this.seismographConfig.windowAmp) {
                this.recheckAmpScaleDomain();
            }
            this.drawSeismograms();
            this.g
                .select("g.allmarkers")
                .selectAll("g.marker")
                .attr("transform", function (v) {
                const mh = v;
                mh.xscale = mythis.timeScaleForSeisDisplayData(mh.sdd);
                const textx = mh.xscale.for(mh.marker.time);
                return "translate(" + textx + "," + 0 + ")";
            });
            this.g
                .select("g.allmarkers")
                .selectAll("g.markertext")
                .attr("transform", function () {
                // shift up by this.seismographConfig.markerTextOffset percentage
                const axisScale = mythis.ampScaleForAxis();
                const maxY = axisScale.range()[0];
                const deltaY = axisScale.range()[0] - axisScale.range()[1];
                const texty = maxY - mythis.seismographConfig.markerTextOffset * deltaY;
                return ("translate(" +
                    0 +
                    "," +
                    texty +
                    ") rotate(" +
                    mythis.seismographConfig.markerTextAngle +
                    ")");
            });
            const undrawnMarkers = this._seisDataList
                .reduce((acc, sdd) => {
                const sddXScale = this.timeScaleForSeisDisplayData(sdd);
                sdd.markerList.forEach((m) => acc.push({
                    // use marker holder to also hold xscale in case relative plot
                    marker: m,
                    sdd: sdd,
                    xscale: sddXScale,
                }));
                return acc;
            }, new Array(0))
                .filter((mh) => {
                const xpixel = mh.xscale.for(mh.marker.time);
                return xpixel >= mh.xscale.range[0] && xpixel <= mh.xscale.range[1];
            });
            if (undrawnMarkers.length !== 0) {
                this.drawMarkers();
            }
            this.drawTopBottomAxis();
        }
    }
    drawMarkers() {
        const axisScale = this.ampScaleForAxis();
        const allMarkers = this._seisDataList
            .reduce((acc, sdd) => {
            const sddXScale = this.timeScaleForSeisDisplayData(sdd);
            sdd.markerList.forEach((m) => acc.push({
                // use marker holder to also hold xscale in case relative plot
                marker: m,
                sdd: sdd,
                xscale: sddXScale,
            }));
            return acc;
        }, [])
            .filter((mh) => {
            const xpixel = mh.xscale.for(mh.marker.time);
            return xpixel >= mh.xscale.range[0] && xpixel <= mh.xscale.range[1];
        });
        // marker overlay
        const mythis = this;
        const markerG = this.g.select("g.allmarkers");
        markerG.selectAll("g.marker").remove();
        const labelSelection = markerG
            .selectAll("g.marker")
            .data(allMarkers, function (v) {
            const mh = v;
            // key for data
            return `${mh.marker.name}_${mh.marker.time.toISO()}`;
        });
        labelSelection.exit().remove();
        const radianTextAngle = (this.seismographConfig.markerTextAngle * Math.PI) / 180;
        labelSelection
            .enter()
            .append("g")
            .classed("marker", true) // translate so marker time is zero
            .attr("transform", function (v) {
            const mh = v;
            const textx = mh.xscale.for(mh.marker.time);
            return "translate(" + textx + "," + 0 + ")";
        })
            .each(function (mh) {
            const drawG = (0, d3_selection_1.select)(this);
            drawG.classed(mh.marker.name, true).classed(mh.marker.markertype, true);
            const innerTextG = drawG
                .append("g")
                .attr("class", "markertext")
                .attr("transform", () => {
                // shift up by this.seismographConfig.markerTextOffset percentage
                const maxY = axisScale.range()[0];
                const deltaY = axisScale.range()[0] - axisScale.range()[1];
                const texty = maxY - mythis.seismographConfig.markerTextOffset * deltaY;
                return ("translate(" +
                    0 +
                    "," +
                    texty +
                    ") rotate(" +
                    mythis.seismographConfig.markerTextAngle +
                    ")");
            });
            innerTextG.append("title").text(() => {
                if (mh.marker.description) {
                    return mh.marker.description;
                }
                else {
                    return (mh.marker.markertype +
                        " " +
                        mh.marker.name +
                        " " +
                        mh.marker.time.toISO());
                }
            });
            const textSel = innerTextG.append("text");
            if (mh.marker.link && mh.marker.link.length > 0) {
                // if marker has link, make it clickable
                textSel
                    .append("svg:a")
                    .attr("xlink:href", () => "" + mh.marker.link)
                    .text(function (datum) {
                    const mh = datum;
                    return mh.marker.name;
                });
            }
            else {
                textSel.text(function (datum) {
                    const mh = datum;
                    return mh.marker.name;
                });
            }
            textSel.attr("dy", "-0.35em").call(function (selection) {
                // this stores the BBox of the text in the bbox field for later use
                selection.each(function (datum) {
                    const mh = datum;
                    // set a default just in case
                    mh.bbox = {
                        height: 15,
                        width: 20,
                    };
                    try {
                        mh.bbox = this.getBBox();
                    }
                    catch (error) {
                        // eslint-disable-next-line no-console
                        console.warn(error); // this happens if the text is not yet in the DOM, I think
                        //  https://bugzilla.mozilla.org/show_bug.cgi?id=612118
                    }
                });
            });
            // draw/insert flag behind/before text
            innerTextG.insert("polygon", "text").attr("points", function (datum) {
                const mh = datum;
                let bboxH = 10 + 5; // defaults if no bbox, should not happen
                let bboxW = 10;
                if (mh.bbox) {
                    bboxH = mh.bbox.height + 5;
                    bboxW = mh.bbox.width;
                }
                return ("0,0 " +
                    -1 * bboxH * Math.tan(radianTextAngle) +
                    ",-" +
                    bboxH +
                    " " +
                    bboxW +
                    ",-" +
                    bboxH +
                    " " +
                    bboxW +
                    ",0");
            });
            // let style be in css?
            //              .style("fill", "rgba(220,220,220,.4)");
            let markerPoleY = 0;
            if (mythis.seismographConfig.markerFlagpoleBase === "center") {
                markerPoleY = (axisScale.range()[0] + axisScale.range()[1]) / 2;
            }
            else {
                markerPoleY = axisScale.range()[0];
            }
            const markerPole = `M0,0l0,${markerPoleY}`;
            drawG.append("path").classed("markerpath", true).attr("d", markerPole);
        });
    }
    calcWidthHeight(nOuterWidth, nOuterHeight) {
        if (nOuterWidth <
            this.seismographConfig.margin.left + this.seismographConfig.margin.right) {
            throw new Error(`width too small for margin: ${nOuterWidth} < ${this.seismographConfig.margin.left} + ${this.seismographConfig.margin.right}`);
        }
        if (nOuterHeight <
            this.seismographConfig.margin.top + this.seismographConfig.margin.bottom) {
            throw new Error(`height too small for margin: ${nOuterHeight} < ${this.seismographConfig.margin.top} + ${this.seismographConfig.margin.bottom}`);
        }
        this.outerWidth = nOuterWidth;
        this.outerHeight = nOuterHeight;
        this.height =
            this.outerHeight -
                this.seismographConfig.margin.top -
                this.seismographConfig.margin.bottom;
        this.width =
            this.outerWidth -
                this.seismographConfig.margin.left -
                this.seismographConfig.margin.right;
        this.calcScaleAndZoom();
        if (this.canvasHolder) {
            this.canvasHolder
                .attr("width", this.width)
                .attr("height", this.height + 1);
        }
        if (this.canvas) {
            this.canvas.attr("width", this.width).attr("height", this.height + 1);
        }
    }
    drawTitle() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        axisutil.drawTitle(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput());
    }
    drawXLabel() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        axisutil.drawXLabel(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput());
    }
    drawXSublabel() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        axisutil.drawXSublabel(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput());
    }
    drawYLabel() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        axisutil.drawYLabel(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput());
    }
    drawYSublabel() {
        const wrapper = this.getShadowRoot().querySelector("div");
        const svgEl = wrapper.querySelector("svg");
        const unitsLabel = this.seismographConfig.ySublabelIsUnits
            ? this.createUnitsLabel()
            : "";
        axisutil.drawYSublabel(svgEl, this.seismographConfig, this.height, this.width, this.createHandlebarsInput(), unitsLabel);
    }
    /**
     * Update the duration if not already set. This only matters for
     * linedTimeScale currently.
     */
    calcTimeScaleDomain() {
        if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
            const linkedTimeScale = this.seismographConfig.linkedTimeScale;
            if (this._seisDataList.length !== 0 &&
                linkedTimeScale.duration.toMillis() === 0) {
                this.seismographConfig.linkedTimeScale.duration = (0, seismogram_1.findMaxDuration)(this._seisDataList);
            }
        }
    }
    /**
     * Calculate the amplitude range over the current time range, depending
     * on amplitude style.
     *
     * @returns min max over the time range
     */
    calcAmpScaleDomain() {
        let minMax;
        if (this.seismographConfig.fixedAmplitudeScale) {
            minMax = scale_1.MinMaxable.fromArray(this.seismographConfig.fixedAmplitudeScale);
        }
        else {
            if (this.seismographConfig.windowAmp) {
                if ((0, util_2.isDef)(this.seismographConfig.linkedTimeScale)) {
                    minMax = (0, seismogram_1.findMinMaxOverRelativeTimeRange)(this._seisDataList, this.seismographConfig.linkedTimeScale.offset, this.seismographConfig.linkedTimeScale.duration, this.seismographConfig.doGain, this.seismographConfig.amplitudeMode);
                }
                else if ((0, util_2.isDef)(this.seismographConfig.fixedTimeScale)) {
                    minMax = (0, seismogram_1.findMinMaxOverTimeRange)(this._seisDataList, this.seismographConfig.fixedTimeScale, this.seismographConfig.doGain, this.seismographConfig.amplitudeMode);
                }
                else {
                    throw new Error("neither fixed nor linked time scale");
                }
            }
            else {
                minMax = (0, seismogram_1.findMinMax)(this._seisDataList, this.seismographConfig.doGain, this.seismographConfig.amplitudeMode);
            }
            if (minMax.halfWidth === 0) {
                // flatlined data, use -1, +1
                //minMax = [minMax[0] - 1, minMax[1] + 1];
            }
            if (this.seismographConfig.isYAxisNice) {
                // use d3 scale's nice function
                let scale = (0, d3_scale_1.scaleLinear)();
                scale.domain(minMax.asArray());
                scale = scale.nice();
                minMax = scale_1.MinMaxable.fromArray(scale.domain());
            }
        }
        return minMax;
    }
    recheckAmpScaleDomain() {
        const calcMidHW = this.calcAmpScaleDomain();
        const oldMiddle = this.amp_scalable.middle;
        const oldHalfWidth = this.amp_scalable.halfWidth;
        this.amp_scalable.minMax = calcMidHW;
        if (this.seismographConfig.linkedAmplitudeScale) {
            if (this.amp_scalable.middle !== oldMiddle ||
                this.amp_scalable.halfWidth !== oldHalfWidth) {
                this.seismographConfig.linkedAmplitudeScale
                    .recalculate() // sets yScale.domain
                    .catch((m) => {
                    // eslint-disable-next-line no-console
                    console.warn(`problem recalc amp scale: ${m}`);
                });
            }
        }
        else {
            this.redoDisplayYScale();
        }
    }
    redoDisplayYScale() {
        this.rescaleYAxis();
        if (this.seismographConfig.ySublabelIsUnits) {
            this.drawYSublabel();
        }
    }
    createUnitsLabel() {
        let ySublabel = "";
        if (this.seismographConfig.doGain &&
            this._seisDataList.length > 0 &&
            this._seisDataList.every((sdd) => sdd.hasSensitivity()) &&
            this._seisDataList.every((sdd) => (0, util_2.isDef)(sdd.seismogram) && sdd.seismogram.yUnit === seismogram_1.COUNT_UNIT)) {
            // each has seisitivity
            const firstSensitivity = this._seisDataList[0].sensitivity;
            const allSameUnits = firstSensitivity &&
                this._seisDataList.every((sdd) => (0, util_2.isDef)(firstSensitivity) &&
                    sdd.sensitivity &&
                    firstSensitivity.inputUnits === sdd.sensitivity.inputUnits);
            if (this.seismographConfig.ySublabelIsUnits) {
                const unitList = this._seisDataList
                    .map((sdd) => sdd.sensitivity ? sdd.sensitivity.inputUnits : "uknown")
                    .join(",");
                if (!allSameUnits) {
                    ySublabel = unitList;
                }
                else {
                    ySublabel = firstSensitivity.inputUnits;
                }
            }
        }
        else {
            if (this.seismographConfig.ySublabelIsUnits) {
                ySublabel = "";
                const allUnits = [];
                for (const t of this._seisDataList) {
                    if (t.seismogram) {
                        const u = t.seismogram.yUnit;
                        allUnits.push(u);
                    }
                }
                if (allUnits.length === 0) {
                    allUnits.push("Count");
                }
                ySublabel = allUnits.join(" ");
            }
        }
        if (this.seismographConfig.ySublabelIsUnits &&
            this.seismographConfig.isCenteredAmp()) {
            ySublabel = `centered ${ySublabel}`;
        }
        return ySublabel;
    }
    getSeismogramData() {
        return this._seisDataList;
    }
    /**
     * can append single seismogram segment or an array of segments.
     *
     * @param sddList array or single SeismogramDisplayData or Seismogram
     * @private
     */
    _internalAppend(sddList) {
        if (!sddList) {
            // don't append a null
        }
        else if (Array.isArray(sddList)) {
            for (const s of sddList) {
                if (s instanceof seismogram_1.SeismogramDisplayData) {
                    this._seisDataList.push(s);
                }
                else {
                    this._seisDataList.push(seismogram_1.SeismogramDisplayData.fromSeismogram(s));
                }
            }
        }
        else {
            if (sddList instanceof seismogram_1.SeismogramDisplayData) {
                this._seisDataList.push(sddList);
            }
            else {
                this._seisDataList.push(seismogram_1.SeismogramDisplayData.fromSeismogram(sddList));
            }
        }
    }
    /**
     * appends the seismogram(s) or SeismogramDisplayData as separate time series.
     *
     * @param seismogram data to append
     */
    appendSeisData(seismogram) {
        this._internalAppend(seismogram);
        this.seisDataUpdated();
    }
    /**
     * Notification to the element that something about the current seismogram
     * data has changed. This could be that the actual waveform data has been updated
     * or that auxillary data like quake or channel has been added. This should
     * trigger a redraw.
     */
    seisDataUpdated() {
        this.calcTimeScaleDomain();
        this.recheckAmpScaleDomain();
        if (!this.beforeFirstDraw) {
            // only trigger a draw if appending after already drawn on screen
            // otherwise, just append the data and wait for outside to call first draw()
            //this.drawSeismograms();
            this.redraw();
        }
    }
    /**
     * Finds the SeismogramDisplayData within the display containing the given
     * Seismogram.
     *
     * @param   seis seismogram to search for
     * @returns       SeismogramDisplayData if found or null if not
     */
    getDisplayDataForSeismogram(seis) {
        const out = this._seisDataList.find((sd) => sd.seismogram === seis);
        if (out) {
            return out;
        }
        else {
            return null;
        }
    }
    /**
     * Removes a seismogram from the display.
     *
     * @param   seisData seis data to remove
     */
    removeSeisData(seisData) {
        this._seisDataList = this._seisDataList.filter((sd) => sd !== seisData);
    }
    /**
     * Removes seismograms that do not overlap the window.
     *
     * @param   timeRange overlap data to keep
     */
    trim(timeRange) {
        if (this._seisDataList) {
            this._seisDataList = this._seisDataList.filter(function (d) {
                return d.timeRange.overlaps(timeRange);
            });
            if (this._seisDataList.length > 0) {
                this.recheckAmpScaleDomain();
                this.drawSeismograms();
            }
        }
    }
}
exports.Seismograph = Seismograph;
class SeismographAmplitudeScalable extends scale_1.AmplitudeScalable {
    graph;
    drawHalfWidth;
    drawMiddle;
    constructor(graph) {
        const calcMidHW = graph.calcAmpScaleDomain();
        super(calcMidHW);
        this.graph = graph;
        this.drawHalfWidth = super.halfWidth;
        this.drawMiddle = super.middle;
    }
    notifyAmplitudeChange(middle, halfWidth) {
        if (middle !== this.drawMiddle || halfWidth !== this.drawHalfWidth) {
            this.drawMiddle = middle;
            this.drawHalfWidth = halfWidth;
            this.graph.redoDisplayYScale();
            if (!this.graph.beforeFirstDraw) {
                // only trigger a draw if appending after already drawn on screen
                // otherwise, just append the data and wait for outside to call first draw()
                this.graph.redraw();
            }
        }
    }
}
exports.SeismographAmplitudeScalable = SeismographAmplitudeScalable;
exports.ZERO_DURATION = luxon_1.Duration.fromMillis(0);
class SeismographTimeScalable extends scale_1.TimeScalable {
    graph;
    drawAlignmentTimeOffset;
    drawDuration;
    constructor(graph, alignmentTimeOffset, duration) {
        super(alignmentTimeOffset, duration);
        this.graph = graph;
        this.drawAlignmentTimeOffset = exports.ZERO_DURATION;
        this.drawDuration = exports.ZERO_DURATION;
    }
    notifyTimeRangeChange(offset, duration) {
        if (!this.drawAlignmentTimeOffset.equals(offset) ||
            !this.drawDuration.equals(duration)) {
            this.drawAlignmentTimeOffset = offset;
            this.drawDuration = duration;
            // something changed, maybe redraw
            if ((0, util_2.isDef)(this.graph) && !this.graph.beforeFirstDraw) {
                window.requestAnimationFrame(() => {
                    this.graph.redrawWithXScale();
                });
            }
        }
    }
}
exports.SeismographTimeScalable = SeismographTimeScalable;
// static ID for seismogram
Seismograph._lastID = 0;
/**
 * Creates a wrapper for d3 formatter for numbers for axis that keeps typescript happy.
 *
 * @param  formatter simple formatter
 * @returns           function that converts input types
 */
function createNumberFormatWrapper(formatter) {
    return (nValue) => {
        if (typeof nValue === "number") {
            return formatter(nValue);
        }
        else {
            return formatter(nValue.valueOf());
        }
    };
}
/**
 * Creates a wrapper for d3 formatter for Dates for axis that keeps typescript happy.
 *
 * @param  formatter simple formatter
 * @returns           function that converts input types
 */
function createDateFormatWrapper(formatter) {
    return (nValue) => {
        if (nValue instanceof Date) {
            return formatter(nValue);
        }
        else if (typeof nValue === "number") {
            return formatter(new Date(nValue));
        }
        else {
            return formatter(new Date(nValue.valueOf()));
        }
    };
}
customElements.define(exports.SEISMOGRAPH_ELEMENT, Seismograph);
