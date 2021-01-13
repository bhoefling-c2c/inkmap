import { map, switchMap, take, takeWhile } from 'rxjs/operators';

import '../printer';
import { MESSAGE_JOB_REQUEST } from '../shared/constants';
import { registerWithExtent } from '../shared/projections';
import { messageToPrinter } from './exchange';
import { getJobStatusObservable, newJob$ } from './jobs';

export { downloadBlob } from './utils';

/**
 * @typedef {Object} TileGrid
 * @property {!Array<number>} resolutions Resolutions. The array index of each
 * resolution needs to match the zoom level. This means that even if a `minZoom`
 * is configured, the resolutions array will have a length of `maxZoom + 1`
 * @property {Array<string>} matrixIds matrix IDs. The length of this array needs
 * to match the length of the `resolutions` array. By default, it will be [0, 1, 2, ..., resolutions.length-1]
 * @property {number} tileSize Tile size.
 */

/**
 * @typedef {Object} WmsLayer
 * @property {'WMS'} type
 * @property {string} url
 * @property {string} layer Layer name.
 * @property {number} opacity Opacity, from 0 (hidden) to 1 (visible).
 * @property {boolean} [tiled=false] Whether the WMS layer should be requested as tiles.
 */

/**
 * @typedef {Object} XyzLayer
 * @property {'XYZ'} type
 * @property {string} url URL or URL template for the layer; can contain the following tokens: `{a-d}` for randomly choosing a letter, `{x}`, `{y}` and `{z}`.
 * @property {number} opacity Opacity, from 0 (hidden) to 1 (visible).
 */

/**
 * @typedef {Object} WmtsLayer
 * @property {'WMTS'} type
 * @property {number} opacity Opacity, from 0 (hidden) to 1 (visible)
 * @property {string} url A URL for the service.
 * @property {string} requestEncoding Request encoding; valid values are `KVP`, `REST`.
 * @property {string} format Image format. Only used when `requestEncoding` is `'KVP'`. eg `image/png`
 * @property {string} layer Layer name as advertised in the WMTS capabilities.
 * @property {string} style Style name as advertised in the WMTS capabilities.
 * @property {!ProjectionLike} projection Projection.
 * @property {string} matrixSet Matrix set.
 * @property {TileGrid} tileGrid Tile grid.
 */

/**
 * @typedef {Object} WfsLayer
 * @property {'WFS'} type
 * @property {string} url URL for the service.
 * @property {number} opacity Opacity, from 0 (hidden) to 1 (visible).
 * @property {string} layer Layer name as advertised in the WFS capabilities.
 */

/**
 * @typedef {WmsLayer|XyzLayer|WmtsLayer|WfsLayer} Layer
 */

/**
 * @typedef {Object} ProjectionDefinition
 * @property {string} name Projection name written as `prefix:code`.
 * @property {string} proj4 Proj4 definition.
 * @property {[number, number, number, number]} bbox Projection validity extent.
 */

/**
 * @typedef {Object} PrintSpec
 * @property {Layer[]} layers Array of `Layer` objects that will be rendered in the map; last layers will be rendered on top of first layers.
 * @property {[number, number]|[number, number, string]} size Width and height in pixels, or in the specified unit in 3rd place; valid units are `px`, `mm`, `cm`, `m` and `in`.
 * @property {[number, number]} center Longitude and latitude of the map center.
 * @property {number} dpi Dot-per-inch, usually 96 for a computer screen and 300 for a detailed print.
 * @property {boolean | ScaleBarSpec} scaleBar Indicates whether scalebar should be printed (and optionally its options).
 * @property {number} scale Scale denominator.
 * @property {string} projection EPSG projection code.
 * @property {boolean | string} northArrow North arrow position.
 * @property {ProjectionDefinition} projectionDefinition Projection definition to be newly registered.
 */

/**
 * @typedef {Object} ScaleBarSpec
 * @property {string} [template] Scale text template. The string `{mapScale}` in the template will be replaced the actual value. Default is `Scale: {mapScale}`.
 * @property {string} position Position on the map. Possible values: "bottom-left" (default), "bottom-right".
 * @property {string} units Units for the graphical scalebar. Possible values: "metric" (default), "degrees", "imperial", "nautical", "us".
 */

/**
 * @typedef {Object} ScaleBarParams
 * @property {number} width Width of rendered graphical scalebar in px.
 * @property {number} scalenumber Distance value for rendered graphical scalebar.
 * @property {string} suffix Unit suffix for rendered graphical scalebar.
 */

/**
 * @typedef {Object} PrintStatus
 * @property {number} id Job id.
 * @property {PrintSpec} spec Job initial spec.
 * @property {number} progress Job progress, from 0 to 1.
 * @property {'pending' | 'ongoing' | 'finished'} status Job status.
 * @property {Blob} [imageBlob] Finished image blob.
 * @property {SourceLoadError[]} [sourceLoadErrors] Array of `SourceLoadError` objects.
 */

/**
 * @typedef {Object} SourceLoadError
 * @property {string} url url of the ol.source that encountered at least one 'tileloaderror' or 'imageloaderror'.
 * /

/**
 * Starts generating a map image from a print spec.
 * @param {PrintSpec} printSpec
 * @return {Promise<Blob>} Promise resolving to the final image blob.
 */
export function print(printSpec) {
  messageToPrinter(MESSAGE_JOB_REQUEST, { spec: printSpec });
  return newJob$
    .pipe(
      take(1),
      switchMap((job) => getJobStatusObservable(job.id)),
      takeWhile((job) => job.progress < 1, true),
      map((job) => job.imageBlob)
    )
    .toPromise();
}

/**
 * Starts generating a map image from a print spec. Will simply return the job
 * id for further monitoring.
 * @param {PrintSpec} printSpec
 * @return {Promise<number>} Promise resolving to the print job id.
 */
export function queuePrint(printSpec) {
  messageToPrinter(MESSAGE_JOB_REQUEST, { spec: printSpec });
  return newJob$
    .pipe(
      take(1),
      map((job) => job.id)
    )
    .toPromise();
}

export function getJobsStatus() {
  console.warn('Not implemented yet');
}

/**
 * Returns an observable emitting status objects for a particular job.
 * The observable will complete once the job is ready.
 * @param {number} jobId
 * @return {Observable<PrintStatus>} Observable emitting job status objects.
 */
export function getJobStatus(jobId) {
  return getJobStatusObservable(jobId).pipe(
    takeWhile((job) => job.progress < 1, true)
  );
}

export function cancelJob() {
  console.warn('Not implemented yet');
}

/**
 * Register a new projection from a projection definition.
 * @param {ProjectionDefinition} definition
 */
export function registerProjection(definition) {
  registerWithExtent(definition.name, definition.proj4, definition.bbox);
}
