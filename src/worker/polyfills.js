/**
 * This defines an Image class on the worker thread, to allow libraries such as
 * OpenLayers to work more or less seamlessly.
 * Image elements are useful for loading images over HTTP and decoding them,
 * but unfortunately this is not available in workers. As such, this replaces
 * the Image class with a extended OffscreenCanvas class so as to sort of
 * reproduce the Image class behaviour.
 */
class Image extends OffscreenCanvas {
  constructor() {
    super(1, 1);
    this.src_ = null;
    this.hintImageSize(1, 1);
    this.loadPromiseResolver = null;
    this.loadPromise = new Promise(
      (resolve) => (this.loadPromiseResolver = resolve)
    );
  }

  // this is a new API, required because we cannot guess an image size
  // simply from the blob received by `fetch`
  hintImageSize(width, height) {
    this.width = width;
    this.height = height;
    this.naturalWidth = width;
    this.naturalHeight = height;
  }

  // setting `src` will trigger a loading of the image and a trigger of a `load` event eventually
  set src(url) {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const ctx = this.getContext('2d');
        createImageBitmap(blob).then((imageData) => {
          ctx.drawImage(imageData, 0, 0);
          this.loadPromiseResolver();
        });
      });
  }
  get src() {
    return this.src_;
  }

  // this is to sort of comply with the HTMLImage API
  addEventListener(eventName, callback) {
    if (eventName === 'load') {
      this.loadPromise.then(callback);
    }
  }
  removeEventListener() {}
}

self.Image = Image;
