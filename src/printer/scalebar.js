import { getPointResolution, METERS_PER_UNIT } from 'ol/proj';
import ProjUnits from 'ol/proj/Units';
import { Units } from 'ol/control/ScaleLine';

/**
 * Determines scalebar size and annotation and prints it to map.
 * @param {CanvasRenderingContext2D} ctx
 * @param {FrameState} frameState
 * @param {PrintSpec} spec
 */
export function printScaleBar(ctx, frameState, spec) {
  const scaleBarParams = getScaleBarParams(frameState, spec);
  renderScaleBar(ctx, frameState, scaleBarParams, spec);
}

/**
 * Gets width and annotation for graphical scalebar.
 * @param {FrameState} frameState
 * @param {PrintSpec} spec
 * @return {ScaleBarParams}
 */
function getScaleBarParams(frameState, spec) {
  // default values like ol.control.ScaleLine
  const minWidth = 64;
  const LEADING_DIGITS = [1, 2, 5];

  const center = frameState.viewState.center;
  const projection = frameState.viewState.projection;
  // use units from spec if provided, default "metric"
  const units = spec.scaleBar.units ? spec.scaleBar.units : 'metric';
  const pointResolutionUnits =
    units == Units.DEGREES ? ProjUnits.DEGREES : ProjUnits.METERS;
  let pointResolution = getPointResolution(
    projection,
    frameState.viewState.resolution,
    center,
    pointResolutionUnits
  );

  let nominalCount = minWidth * pointResolution;
  let suffix = '';

  if (units == Units.DEGREES) {
    const metersPerDegree = METERS_PER_UNIT[ProjUnits.DEGREES];
    nominalCount *= metersPerDegree;
    if (nominalCount < metersPerDegree / 60) {
      suffix = '\u2033'; // seconds
      pointResolution *= 3600;
    } else if (nominalCount < metersPerDegree) {
      suffix = '\u2032'; // minutes
      pointResolution *= 60;
    } else {
      suffix = '\u00b0'; // degrees
    }
  } else if (units == Units.IMPERIAL) {
    if (nominalCount < 0.9144) {
      suffix = 'in';
      pointResolution /= 0.0254;
    } else if (nominalCount < 1609.344) {
      suffix = 'ft';
      pointResolution /= 0.3048;
    } else {
      suffix = 'mi';
      pointResolution /= 1609.344;
    }
  } else if (units == Units.NAUTICAL) {
    pointResolution /= 1852;
    suffix = 'nm';
  } else if (units == Units.METRIC) {
    if (nominalCount < 0.001) {
      suffix = 'μm';
      pointResolution *= 1000000;
    } else if (nominalCount < 1) {
      suffix = 'mm';
      pointResolution *= 1000;
    } else if (nominalCount < 1000) {
      suffix = 'm';
    } else {
      suffix = 'km';
      pointResolution /= 1000;
    }
  } else if (units == Units.US) {
    if (nominalCount < 0.9144) {
      suffix = 'in';
      pointResolution *= 39.37;
    } else if (nominalCount < 1609.344) {
      suffix = 'ft';
      pointResolution /= 0.30480061;
    } else {
      suffix = 'mi';
      pointResolution /= 1609.3472;
    }
  } else {
    console.error('Invalid units: Please verify your scaleBar object');
  }

  let i = 3 * Math.floor(Math.log(minWidth * pointResolution) / Math.log(10));
  let count, width, decimalCount;
  while (true) {
    decimalCount = Math.floor(i / 3);
    const decimal = Math.pow(10, decimalCount);
    count = LEADING_DIGITS[((i % 3) + 3) % 3] * decimal;
    width = Math.round(count / pointResolution);
    if (isNaN(width)) {
      return;
    } else if (width >= minWidth) {
      break;
    }
    ++i;
  }
  return {
    width: width,
    scalenumber: count,
    suffix: suffix,
  };
}

/**
 * Renders scalebar on canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {FrameState} frameState
 * @param {ScaleBarParams} scaleBarParams
 * @param {PrintSpec} spec
 */
function renderScaleBar(ctx, frameState, scaleBarParams, spec) {
  const scaleWidth = scaleBarParams.width;
  const scaleNumber = scaleBarParams.scalenumber;
  const scaleUnit = scaleBarParams.suffix;

  const scaleText = `${scaleNumber} ${scaleUnit}`;
  const scaleTextWidth = ctx.measureText(scaleText).width;

  const line1 = 6;
  // use position from spec if provided, default "bottom-left"
  const scaleTotalWidth = scaleWidth + scaleTextWidth;
  const xOffset =
    spec.scaleBar.position === 'bottom-right'
      ? frameState.size[0] - scaleTotalWidth - 20
      : 10;
  const yOffset = 10;
  const fontsize1 = 12;
  const font1 = `${fontsize1}px Arial`;
  const oddColor = '#000000';
  const evenColor = '#FFFFFF';

  ctx.save();
  ctx.globalAlpha = 0.8;

  // Scale Dimensions
  const xzero = scaleWidth + xOffset;
  const yzero = ctx.canvas.height - yOffset;
  const xfirst = xOffset + (scaleWidth * 1) / 4;
  const xsecond = xfirst + (scaleWidth * 1) / 4;
  const xthird = xsecond + (scaleWidth * 1) / 4;
  const xfourth = xthird + (scaleWidth * 1) / 4;

  // Scale Text
  ctx.beginPath();
  ctx.textAlign = 'left';
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#000000';
  ctx.lineWidth = 5;
  ctx.font = font1;

  // Number with units
  ctx.strokeText([scaleText], xzero + 5, yzero + fontsize1 / 2);
  ctx.fillText([scaleText], xzero + 5, yzero + fontsize1 / 2);

  // Stroke
  ctx.beginPath();
  ctx.lineWidth = line1 + 2;
  ctx.strokeStyle = '#000000';
  ctx.moveTo(xOffset, yzero);
  ctx.lineTo(xzero + 1, yzero);
  ctx.stroke();

  // sections black/white
  ctx.beginPath();
  ctx.lineWidth = line1;
  ctx.strokeStyle = oddColor;
  ctx.moveTo(xOffset, yzero);
  ctx.lineTo(xfirst, yzero);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = line1;
  ctx.strokeStyle = evenColor;
  ctx.moveTo(xfirst, yzero);
  ctx.lineTo(xsecond, yzero);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = line1;
  ctx.strokeStyle = oddColor;
  ctx.moveTo(xsecond, yzero);
  ctx.lineTo(xthird, yzero);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = line1;
  ctx.strokeStyle = evenColor;
  ctx.moveTo(xthird, yzero);
  ctx.lineTo(xfourth, yzero);
  ctx.stroke();

  ctx.restore();
}
