// Copyright 2014 Nicholas Bray

var canvasPixelRatio = function(ctx) {
    var devicePixelRatio = window.devicePixelRatio || 1;
    var backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio ||
	1;
    return devicePixelRatio / backingStoreRatio;
};

var setCanvasSize = function(c, width, height) {
    var ctx = c.getContext('2d');
    var ratio = canvasPixelRatio(ctx);
    c.width = width * ratio;
    c.height = height * ratio;
    if (ratio != 1) {
	// Make sure borders don't shift the size...
	c.style.boxSizing = 'content-box';
	// TODO -webkit- and -moz-?
	c.style.width = width + 'px';
	c.style.height = height + 'px';
	ctx.scale(ratio, ratio);
    }
    return ratio;
};

// TODO polyfill performance.now() and requestAnimationFrame

var GameRunner = function() {
    var runner = this;
    this.pumpFrame = function() {
	runner.doFrame();
    };
    this.pending = 0;
};

GameRunner.prototype.onFrame = function(callback) {
    this.frameCallback = callback;
    return this;
};

GameRunner.prototype.requestFrame = function() {
    if (this.pending) {
	cancelRequestAnimationFrame(this.pending);
    }
    requestAnimationFrame(this.pumpFrame);
};

GameRunner.prototype.doFrame = function() {
    this.pending = 0;
    this.requestFrame();

    var current = performance.now();
    if (this.last === undefined) {
	this.last = current;
    }
    var dt = current - this.last;
    this.last = current;

    this.frameCallback(dt*0.001);
};
