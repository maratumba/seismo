/*
 * Philip Crotwell
 * University of South Carolina, 2019
 * https://www.seis.sc.edu
 */
import { DateTime, Duration, Interval } from "luxon";
import { checkStringOrDate, isDef, checkLuxonValid } from "../utils";
import { MinMaxable } from "./scale";
import * as seedcodec from "../waveform/seed-codec";
import { FDSNSourceId, NslcId } from "../fdsn/source-id";
export const COUNT_UNIT = "count";
export type HighLowType = {
  xScaleDomain: Array<Date>;
  xScaleRange: Array<number>;
  secondsPerPixel: number;
  samplesPerPixel: number;
  highlowArray: Array<number>;
};

/**
 * A contiguous segment of a Seismogram.
 *
 * @param  yArray array of Y sample values, ie the timeseries
 * @param  sampleRate sample rate of the seismogram, hertz
 * @param  startTime start time of seismogrm as a luxon DateTime in utc or a string that can be parsed
 */
export class SeismogramSegment {
  /** Array of y values */
  _y: null | Int32Array | Float32Array | Float64Array;
  _compressed: null | Array<seedcodec.EncodedDataSegment>;

  /**
   * the sample rate in hertz
   *
   * @private
   */
  _sampleRate: number;

  /** @private */
  _startTime: DateTime;
  _endTime_cache: null | DateTime;
  _endTime_cache_numPoints: number;
  _sourceId: FDSNSourceId;
  yUnit: string;
  _highlow: HighLowType | undefined;

  constructor(
    yArray:
      | Array<seedcodec.EncodedDataSegment>
      | Array<number>
      | Int32Array
      | Float32Array
      | Float64Array,
    sampleRate: number,
    startTime: DateTime,
    sourceId?: FDSNSourceId,
  ) {
    if (
      yArray instanceof Int32Array ||
      yArray instanceof Float32Array ||
      yArray instanceof Float64Array
    ) {
      this._y = yArray;
      this._compressed = null;
    } else if (
      Array.isArray(yArray) &&
      yArray.every((ee) => ee instanceof seedcodec.EncodedDataSegment)
    ) {
      this._compressed =
        yArray as unknown as Array<seedcodec.EncodedDataSegment>;
      this._y = null;
    } else if (
      Array.isArray(yArray) &&
      yArray.every((ee) => typeof ee === "number")
    ) {
      // numbers in js are 64bit, so...
      this._y = Float64Array.from(yArray as unknown as Array<number>);
      this._compressed = null;
    } else {
      this._compressed = null;
      this._y = null;
    }

    if (sampleRate <= 0) {
      throw new Error(`SampleRate must be positive number: ${sampleRate}`);
    }
    this._sampleRate = sampleRate;
    this._startTime = checkStringOrDate(startTime);
    this.yUnit = COUNT_UNIT;
    this._sourceId = sourceId
      ? sourceId
      : FDSNSourceId.createUnknown(sampleRate);
    // to avoid recalc of end time as it is kind of expensive
    this._endTime_cache = null;
    this._endTime_cache_numPoints = 0;
  }

  /**
   * Y data of the seismogram. Decompresses data if needed.
   *
   * @returns y data as typed array
   */
  get y(): Int32Array | Float32Array | Float64Array {
    let out;

    if (this._y) {
      out = this._y;
    } else {
      if (!this.isEncoded()) {
        throw new Error("Seismogram not y as TypedArray or encoded.");
      }

      // data is still compressed
      const outLen = this.numPoints;

      if (this._compressed === null) {
        throw new Error("Seismogram not y as TypedArray or encoded.");
      }

      if (this._compressed[0].compressionType === seedcodec.DOUBLE) {
        out = new Float64Array(outLen);
      } else if (this._compressed[0].compressionType === seedcodec.FLOAT) {
        out = new Float32Array(outLen);
      } else {
        out = new Int32Array(outLen);
      }

      let currIdx = 0;

      for (const c of this._compressed) {
        const cData = c.decode();

        for (let i = 0; i < c.numSamples; i++) {
          out[currIdx + i] = cData[i];
        }

        currIdx += c.numSamples;
      }

      this._y = out;
      this._compressed = null;
    }

    return out;
  }

  set y(value: Int32Array | Float32Array | Float64Array) {
    this._y = value;

    this._invalidate_endTime_cache();
  }

  get start(): DateTime {
    return this.startTime;
  }

  set start(value: DateTime | string) {
    this.startTime = value;
  }

  get startTime(): DateTime {
    return this._startTime;
  }

  set startTime(value: DateTime | string) {
    this._startTime = checkStringOrDate(value);

    this._invalidate_endTime_cache();
  }

  get end(): DateTime {
    return this.endTime;
  }

  get endTime(): DateTime {
    if (
      !this._endTime_cache ||
      this._endTime_cache_numPoints !== this.numPoints
    ) {
      // array length modified, recalc cached end time
      this._endTime_cache_numPoints = this.numPoints;
      this._endTime_cache = this.timeOfSample(
        this._endTime_cache_numPoints - 1,
      );
    }

    return this._endTime_cache;
  }

  get timeRange(): Interval {
    return Interval.fromDateTimes(this.startTime, this.endTime);
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  set sampleRate(value: number) {
    this._sampleRate = value;

    this._invalidate_endTime_cache();
  }

  get samplePeriod(): number {
    return 1.0 / this.sampleRate;
  }

  get numPoints(): number {
    let out = 0;

    if (this._y) {
      out = this._y.length;
    } else if (this._compressed) {
      for (const c of this._compressed) {
        out += c.numSamples;
      }
    }

    return out;
  }

  get networkCode(): string {
    return this._sourceId.networkCode;
  }

  get stationCode(): string | null {
    return this._sourceId.stationCode;
  }

  get locationCode(): string | null {
    return this._sourceId.locationCode;
  }

  get channelCode(): string | null {
    return this._sourceId.formChannelCode();
  }

  /**
   * Checks if the data is encoded
   *
   * @returns true if encoded, false otherwise
   */
  isEncoded(): boolean {
    if (this._y && this._y.length > 0) {
      return false;
    } else if (this._compressed && this._compressed.length > 0) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Gets encoded data, if it is.
   *
   * @returns array of encoded data segments
   * @throws Error if data is not encoded
   */
  getEncoded(): Array<seedcodec.EncodedDataSegment> {
    const compressed = this._compressed;
    if (this.isEncoded() && compressed != null) {
      return compressed;
    } else {
      throw new Error("Data is not encoded.");
    }
  }

  yAtIndex(i: number): number {
    if (i >= 0) {
      return this.y[i];
    } else {
      return this.y[this.numPoints + i];
    }
  }

  /**
   * Finds the min and max values of a SeismogramSegment, with an optional
   * accumulator for use with gappy data.
   *
   * @param minMaxAccumulator optional initialized accumulator as an array
   * of two numbers, min and max
   * @returns min, max as arry of length two
   */
  findMinMax(minMaxAccumulator?: MinMaxable): MinMaxable {
    let minAmp = Number.MAX_SAFE_INTEGER;
    let maxAmp = -1 * minAmp;

    if (minMaxAccumulator) {
      minAmp = minMaxAccumulator.min;
      maxAmp = minMaxAccumulator.max;
    }

    const yData = this.y;

    for (let n = 0; n < yData.length; n++) {
      if (minAmp > yData[n]) {
        minAmp = yData[n];
      }

      if (maxAmp < yData[n]) {
        maxAmp = yData[n];
      }
    }

    return new MinMaxable(minAmp, maxAmp);
  }

  /**
   * Time of the i-th sample, indexed from zero.
   * If i is negative, counting from end, so
   * timeOfSample(-1) is time of last data point;
   *
   * @param  i               sample index
   * @returns   time
   */
  timeOfSample(i: number): DateTime {
    if (i >= 0) {
      return this.startTime.plus(
        Duration.fromMillis((1000 * i) / this.sampleRate),
      );
    } else {
      return this.startTime.plus(
        Duration.fromMillis((1000 * (this.numPoints + i)) / this.sampleRate),
      );
    }
  }

  indexOfTime(t: DateTime): number {
    if (
      t < this.startTime ||
      t > this.endTime.plus(Duration.fromMillis(1000 / this.sampleRate))
    ) {
      return -1;
    }

    return Math.round(
      (t.diff(this.startTime).toMillis() * this.sampleRate) / 1000,
    );
  }

  hasCodes(): boolean {
    return isDef(this._sourceId);
  }

  /**
   * return network, station, location and channels codes as one string.
   * Uses this.channel if it exists, this.seismogram if not.
   *
   * @returns nslc codes separated by '.'
   */
  get nslc(): string {
    return this.codes();
  }

  get nslcId(): NslcId {
    return this._sourceId.asNslc();
  }

  /**
   * return network, station, location and channels codes as one string
   *
   * @param sep separator, defaults to '.'
   * @returns nslc codes separated by sep
   */
  codes(sep = "."): string {
    return (
      (this.networkCode ? this.networkCode : "") +
      sep +
      (this.stationCode ? this.stationCode : "") +
      sep +
      (this.locationCode ? this.locationCode : "") +
      sep +
      (this.channelCode ? this.channelCode : "")
    );
  }

  seisId(): string {
    const out = `${this.sourceId.toString()}_${this.startTime.toISO()}_${this.endTime.toISO()}`;
    return out.replace(/\./g, "_").replace(/:/g, "");
  }

  /**
   * return FDSN source id.
   *
   * @returns FDSN source id
   */
  get sourceId(): FDSNSourceId {
    return this._sourceId;
  }

  set sourceId(sid: FDSNSourceId) {
    this._sourceId = sid;
  }

  clone(): SeismogramSegment {
    let out: SeismogramSegment;
    if (isDef(this._y)) {
      out = this.cloneWithNewData(this._y.slice());
    } else if (this.isEncoded()) {
      // shallow copy array, assume Encoded is immutable
      out = this.cloneWithNewData(Array.from(this.getEncoded()));
    } else {
      throw new Error("no _y and no _compressed");
    }
    return out;
  }

  cloneWithNewData(
    clonedData:
      | Array<seedcodec.EncodedDataSegment>
      | Int32Array
      | Float32Array
      | Float64Array,
    clonedStartTime: DateTime = this._startTime,
  ): SeismogramSegment {
    const out = new SeismogramSegment(
      clonedData,
      this.sampleRate,
      clonedStartTime,
      this._sourceId.clone(),
    );
    out.yUnit = this.yUnit;
    return out;
  }

  cut(timeRange: Interval): SeismogramSegment | null {
    checkLuxonValid(timeRange);
    if (
      timeRange.start == null ||
      timeRange.end == null ||
      timeRange.end < this._startTime ||
      timeRange.start > this.endTime
    ) {
      return null;
    }

    let sIndex = 0;

    if (timeRange.start > this._startTime) {
      const milliDiff = timeRange.start.diff(this._startTime).toMillis();
      const offset = (milliDiff * this.sampleRate) / 1000.0;
      sIndex = Math.floor(offset);
    }

    let eIndex = this.y.length;

    if (timeRange.end < this.endTime) {
      const milliDiff = this.endTime.diff(timeRange.end).toMillis();
      const offset = (milliDiff * this.sampleRate) / 1000.0;
      eIndex = this.y.length - Math.floor(offset);
    }

    const cutY = this.y.slice(sIndex, eIndex);
    const out = this.cloneWithNewData(
      cutY,
      this._startTime.plus(
        Duration.fromMillis((1000 * sIndex) / this.sampleRate),
      ),
    );
    return out;
  }

  _invalidate_endTime_cache() {
    this._endTime_cache = null;
    this._endTime_cache_numPoints = 0;
  }
}
