/*
 * @author  Don Park
 * @version 0.2
 * @date    January 21th, 2007
 *
 * (The MIT License)
 *
 * Copyright (c) 2007-2012 Don Park <donpark@docuverse.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * 'Software'), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
'use strict';


const crypto = require('crypto');
const Canvas = require('canvas');


const patchTypes = [
    [0, 4, 24, 20],
    [0, 4, 20],
    [2, 24, 20],
    [0, 2, 20, 22],
    [2, 14, 22, 10],
    [0, 14, 24, 22],
    [2, 24, 22, 13, 11, 22, 20],
    [0, 14, 22],
    [6, 8, 18, 16],
    [4, 20, 10, 12, 2],
    [0, 2, 12, 10],
    [10, 14, 22],
    [20, 12, 24],
    [10, 2, 12],
    [0, 2, 10],
    [0, 4, 24, 20]
];


/** @type {Array} special type options for center patch */
const centerPatchTypes = [0, 4, 8, 15];


class Identicon {

  /**
   * [constructor description]
   * @param  {[type]} options [description]
   * @return {[type]}         [description]
   */
  constructor(options) {
    options = options || {};
    this._edge = options.edge? parseInt(options.edge, 10) : 100;

    this._patchSize = this._edge / 3;
    this._offset = this._patchSize / 2;
    this._scale = this._patchSize / 4;

    this._format = options.format;
    this._salt = options.salt || '';
    this._message = '';

    this._canvas = null;
    this._ctx = null;

    this._background = options.backColor || 'rgb(255,255,255)';

    this._cornerTurn = 0;
    this._sideTurn = 0;

    return this;
  }


  /**
   * [_red description]
   * @return {[type]} [description]
   */
  get _red() { return this._message? (this._hashCode >> 27) & 31 : null; }


  /**
   * [_green description]
   * @return {[type]} [description]
   */
  get _green() { return this._message? (this._hashCode >> 21) & 31 : null; }


  /**
   * [_blue description]
   * @return {[type]} [description]
   */
  get _blue() { return this._message? (this._hashCode >> 16) & 31 : null; }


  /**
   * [_color description]
   * @return {[type]} [description]
   */
  get _color() {
    return this._message
      ? `rgb(${this._red << 3},${this._green << 3},${this._blue << 3})`
      : null
  }


  /**
   * [generate description]
   * @param  {[type]}   message  [description]
   * @param  {Function} callback [description]
   * @return {[type]}            [description]
   */
  generate(message, callback) {
    this._message = message;

    this._cornerTurn = (this._hashCode >> 8) & 3;
    this._sideTurn = (this._hashCode >> 15) & 3;

    this._clearCanvas()
    this._render();

    if (callback == false) {
      return this._canvas.toBuffer()
    }

    if (callback instanceof Function) {
      return this._canvas.toBuffer((err, buf) => callback(err, buf));
    }

    return new Promise((resolve, reject) => {
      this._canvas.toBuffer((err, buf) => {
        if (err) return reject(err);
        resolve(buf)
      })
    })
  }


  /**
   * [_hash description]
   * @return {[type]} [description]
   */
  get _hash() {
    if (!this._message) {
      return null;
    }

    return crypto.createHash('sha1')
      .update(new Buffer(`${this._salt}${this._message}`, 'utf8'))
      .digest('binary');
  }


  /**
   * [_hashCode description]
   * @return {[type]} [description]
   */
  get _hashCode() {
    if (!this._message) {
      return null;
    }

    return (this._hash.charCodeAt(0) << 24)
      | (this._hash.charCodeAt(1) << 16)
      | (this._hash.charCodeAt(2) << 8)
      | this._hash.charCodeAt(3)
  }


  /**
   * [_clearCanvas description]
   * @return {[type]} [description]
   */
  _clearCanvas() {
    this._canvas = this._format === 'svg'
      ? new Canvas(this._edge, this._edge, this._format)
      : new Canvas(this._edge, this._edge);

    this._ctx = this._canvas.getContext('2d');

    return this._canvas;
  }


  /**
   * [_coords description]
   * @param  {[type]} i [description]
   * @return {[type]}   [description]
   */
  _coords(vertices, i) {
    return [
      vertices[i] % 5 * this._scale - this._offset,
      Math.floor(vertices[i] / 5) * this._scale - this._offset
    ]
  }


  /**
   * [_render description]
   * @return {[type]} [description]
   */
  _render() {
    this._renderPatch(null, null, 'middle');

    this._renderPatch(null, 0, 'side'); // top
    this._renderPatch(2, null, 'side'); // right
    this._renderPatch(null, 2, 'side'); // bottom
    this._renderPatch(0, null, 'side'); // left

    this._renderPatch(0, 0, 'corner'); // top-left
    this._renderPatch(2, 0, 'corner'); // top-right
    this._renderPatch(2, 2, 'corner'); // bottom-right
    this._renderPatch(0, 2, 'corner'); // bottom-left

  }


  /**
   * [_renderPatch description]
   * @param  {[type]} x        [description]
   * @param  {[type]} y        [description]
   * @param  {[type]} position [description]
   * @return {[type]}          [description]
   */
  _renderPatch(x, y, position) {
    x = this._resolvePatchParam(x);
    y = this._resolvePatchParam(y);

    const patch = this._resolveType(position) % patchTypes.length
    const vertices = patchTypes[patch];
    const turn = this._resolveTurn(position) % 4;
    const invert = patch !== 15
      ? this._resolveInvert(position)
      : !this._resolveInvert(position)

    this._ctx.save();

    // paint background
    this._ctx.fillStyle = invert? this._color : this._background;
    this._ctx.fillRect(x, y, this._patchSize, this._patchSize);

    // build patch path
    this._ctx.translate(x + this._offset, y + this._offset);
    this._ctx.rotate(turn * Math.PI / 2);

    this._ctx.beginPath();

    const startCoords = this._coords(vertices, 0);
    this._ctx.moveTo(startCoords[0], startCoords[1]);

    vertices.slice(1).forEach((p, i) => {
      const drawCoords = this._coords(vertices, i + 1)
      this._ctx.lineTo(drawCoords[0], drawCoords[1])
    })

    this._ctx.closePath();

    // offset and rotate coordinate space by patch position (x, y) and
    // 'turn' before rendering patch shape

    // render rotated patch using fore color (back color if inverted)
    this._ctx.fillStyle = invert? this._background : this._color;
    this._ctx.fill();

    // restore rotation
    this._ctx.restore();
  }


  /**
   * [_resolveInvert description]
   * @param  {[type]} position [description]
   * @return {[type]}          [description]
   */
  _resolveInvert(position) {
    const values = {
      middle: ((this._hashCode >> 2) & 1) !== 0,
      corner: ((this._hashCode >> 7) & 1) !== 0,
      side: ((this._hashCode >> 14) & 1) !== 0
    }

    return values[position];
  }


  /**
   * [_resolvePatchParam description]
   * @param  {[type]} param [description]
   * @return {[type]}       [description]
   */
  _resolvePatchParam(param) {
    if (param) return param * this._patchSize;
    return param === null? this._patchSize : 0
  }


  /**
   * [_resolveTurn description]
   * @param  {[type]} position [description]
   * @return {[type]}          [description]
   */
  _resolveTurn(position) {
    if (position === 'middle') {
      return 0;
    }

    const prop = `_${position}Turn`;
    let turn = this[prop] === 'undefined'? 0 : this[prop]++;

    return turn;
  }


  /**
   * [_resolveType description]
   * @param  {[type]} position [description]
   * @return {[type]}          [description]
   */
  _resolveType(position) {
    const values = {
      middle: centerPatchTypes[this._hashCode & 3],
      corner: (this._hashCode >> 3) & 15,
      side: (this._hashCode >> 10) & 15
    }

    return values[position];
  }

}


exports = module.exports = Identicon;