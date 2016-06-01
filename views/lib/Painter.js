var Painter = function (svgId) {

    this.svg = document.getElementById(svgId);
    this.elements = [];
    this.nowId = 0;
    this.nowColor = 'black';
    this.nowWidth = '2';
};

// 任何一个图形需要一个唯一的 id,方便在 diff 的时候索引
Painter.prototype.fill = function (shape, attr) {

    this.nowId++;

    var shape = document.createElementNS('http://www.w3.org/2000/svg', shape);
    shape.id = this.nowId;

    console.log(shape);

    for (var i in attr) {

        if (i === 'innerHTML') {
            shape.innerHTML = attr[i];
        } else {
            shape.setAttribute(i, attr[i]);
        }
    }

    shape.setAttribute('fill', this.nowColor);

    this.svg.appendChild(shape);
    this.elements.push(shape);

    console.log(shape);

};

Painter.prototype.attr = function () {

    var attr = {};

    var length = arguments.length;

    var values = arguments[length - 1];

    if (typeof values[0] == "object") {
        attr = values[0];
    } else if (values != null) {

        for (var i = 0; i < values.length; i++) {
            attr[arguments[i]] = values[i];
        }

    }

    return attr;
};

Painter.prototype.circle = function (cx, cy, r) {
    var attr = this.attr('cx', 'cy', 'r', arguments);
    this.fill('circle', attr);
};

Painter.prototype.ellipse = function (cx, cy, rx, ry) {
    var attr = this.attr('cx', 'cy', 'rx', 'ry', arguments);
    this.fill('ellipse', attr);
};

Painter.prototype.rect = function (x, y, width, height) {
    var attr = this.attr('x', 'y', 'width', 'height', arguments);
    this.fill('rect', attr);
};

Painter.prototype.line = function (x1, y1, x2, y2) {
    var attr = this.attr('x1', 'y1', 'x2', 'y2', arguments);

    attr.stroke = this.nowColor;
    attr.strokeWidth = this.nowWidth;

    this.fill('line', attr);
};

Painter.prototype.text = function (x, y, text) {
    var attr = this.attr('x', 'y', 'innerHTML', arguments);

    attr.stroke = this.nowColor;
    attr.strokeWidth = this.nowWidth;

    this.fill('text', attr);
};