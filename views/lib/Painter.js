var Painter = function (svgId) {

    var self = this;

    this.svg = document.getElementById(svgId); // svg 元素
    this.elements = []; // SVG 包含的所有元素,在元素添加时加入数组,删除时移出数组
    this.nowId = 0; // id 累加器,为每个元素赋值唯一的 id
    this.nowColor = 'black'; // 当前选择的颜色
    this.nowWidth = '2'; // 当前选择的线条粗细
    this.nowElement = null; // 记录当前鼠标所在的元素
    this.draging = false; //鼠标是否正在拖动某个元素

    this.startX = 0; // 拖动开始的时候,记录横坐标
    this.startY = 0; // 拖动开始的时候,记录纵坐标

    this.endX = 0; // 拖动结束的时候,记录横坐标
    this.endY = 0; // 拖动结束的时候,记录纵坐标

    this.offsetX = 0; // 拖动偏移横坐标
    this.offsetY = 0; // 拖动偏移纵坐标

    this.svg.addEventListener('mouseenter', function (e) {
        self.nowElement = self.svg;
        console.log(e);
    }, false);

    this.svg.addEventListener('mouseleave', function (e) {
        e.target.style.cursor = 'default';
        console.log(e);
    }, false);

    this.svg.addEventListener('mousemove', function (e) {

        // 清除鼠标样式
        self.clearMouse();

        // 设置鼠标样式
        if (e.target !== self.svg) {
            self.nowElement = e.target;
            self.nowElement.style.cursor = 'move';
        }

        // 这里主要主要的拖动操作
        if (self.draging) {

            self.offsetX = e.clientX - self.startX;
            self.offsetY = e.clientY - self.startY;

            // 刷新起止点
            self.startX = e.clientX;
            self.startY = e.clientY;

            self.move(self.nowElement, self.offsetX, self.offsetY);
        }

    }, false);

    this.svg.addEventListener('click', function (e) {
        if (e.target === self.nowElement) {
            console.log(self.nowElement);
        }
    }, false);

    this.svg.addEventListener('mousedown', function (e) {
        if (self.nowElement !== self.svg && e.target === self.nowElement) {
            self.draging = true;
            console.log('元素拖动开始');
            self.startX = e.clientX;
            self.startY = e.clientY;
        }
    }, false);

    this.svg.addEventListener('mouseup', function (e) {

        if (self.draging) {
            self.draging = false;
            console.log('元素拖动结束');
            self.endX = e.clientX;
            self.endY = e.clientY;
        }

    }, false);

};

// 任何一个图形需要一个唯一的 id,方便在 diff 的时候索引
Painter.prototype.fill = function (shape, attr) {

    this.nowId++;

    var shape = document.createElementNS('http://www.w3.org/2000/svg', shape);
    shape.id = this.nowId;

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

};

// 每次增删改差的时候调用,比较本次和上次的差异,方便增量更新
Painter.prototype.diff = function () {

}

// 改变x 和 y,将对应的元素移动
Painter.prototype.move = function (element, offsetX, offsetY) {

    // 不是x 就是 cx, 不是 y 就是 cy
    var xAttr = null;
    var yAttr = null;
    if (element.hasAttribute('x') && element.hasAttribute('x')) {
        xAttr = 'x';
        yAttr = 'y';
    } else if (element.hasAttribute('cx') && element.hasAttribute('cy')) {
        xAttr = 'cx';
        yAttr = 'cy';
    }

    var newX= parseInt(element.getAttribute('cx')) + parseInt(offsetX);
    element.setAttribute(xAttr, newX);

    var newY= parseInt(element.getAttribute('cy')) + parseInt(offsetY);
    element.setAttribute(yAttr, newY);

}


Painter.prototype.clearMouse = function () {
    for (var x in this.elements) {
        this.elements[x].style.cursor = 'default';
    }
}

// 对属性的简单封装
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