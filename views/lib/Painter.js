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

    this.offsetX = 0; // 拖动偏移横坐标
    this.offsetY = 0; // 拖动偏移纵坐标

    this.onChangeListener = null;

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
            self.move(self.nowElement, e.clientX, e.clientY);
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

    this.diff('add', shape);

};

Painter.prototype.setChangeListener = function (listener) {
    this.onChangeListener = listener;
};

// 每次增删改差的时候调用,比较本次和上次的差异,方便增量更新
Painter.prototype.diff = function (action, element, keyValue) {
    // 如何 diff?
    // svg 由属性组成,遍历属性,找到变动
    // 当增删改差的时候调用 diff 即可,记录下 diff 的属性值
    // action 直接记录修改行为,增删改差
    var diff = null;
    if (action === 'add') {
        diff = {
            action: action,
            elementId: element.id,
            data:element.outerHTML
        };
    } else if (action === 'modify') {
        diff = {
            action: action,
            elementId: element.id,
            data:keyValue
        };
    } else if (action === 'remove') {

    }

    if (this.onChangeListener) {
        this.onChangeListener(diff);
    }

}

// 改变x 和 y,将对应的元素移动
Painter.prototype.move = function (element, toX, toY) {

    // 求 offset
    this.offsetX = toX - this.startX;
    this.offsetY = toY - this.startY;

    // 刷新起止点
    this.startX = toX;
    this.startY = toY;

    switch (this.nowElement.tagName) {
        case 'ellipse':
            var newX = parseInt(element.getAttribute('cx')) + parseInt(this.offsetX);
            element.setAttribute('cx', newX);
            var newY = parseInt(element.getAttribute('cy')) + parseInt(this.offsetY);
            element.setAttribute('cy', newY);
            this.diff('modify', this.nowElement, {cx: newX, cy: newY});
            break;

        case 'circle':
            var newX = parseInt(element.getAttribute('cx')) + parseInt(this.offsetX);
            element.setAttribute('cx', newX);
            var newY = parseInt(element.getAttribute('cy')) + parseInt(this.offsetY);
            element.setAttribute('cy', newY);
            this.diff('modify', this.nowElement, {cx: newX, cy: newY});
            break;

        case 'rect':
            var newX = parseInt(element.getAttribute('x')) + parseInt(this.offsetX);
            element.setAttribute('x', newX);
            var newY = parseInt(element.getAttribute('y')) + parseInt(this.offsetY);
            element.setAttribute('y', newY);
            this.diff('modify', this.nowElement, {x: newX, y: newY});
            break;

        case 'text':
            var newX = parseInt(element.getAttribute('x')) + parseInt(this.offsetX);
            element.setAttribute('x', newX);
            var newY = parseInt(element.getAttribute('y')) + parseInt(this.offsetY);
            element.setAttribute('y', newY);
            this.diff('modify', this.nowElement, {x: newX, y: newY});
            break;

        case 'line':
            var newX1 = parseInt(element.getAttribute('x1')) + parseInt(this.offsetX);
            element.setAttribute('x1', newX1);
            var newY1 = parseInt(element.getAttribute('y1')) + parseInt(this.offsetY);
            element.setAttribute('y1', newY1);
            var newX2 = parseInt(element.getAttribute('x2')) + parseInt(this.offsetX);
            element.setAttribute('x2', newX2);
            var newY2 = parseInt(element.getAttribute('y2')) + parseInt(this.offsetY);
            element.setAttribute('y2', newY2);
            this.diff('modify', this.nowElement, {x1: newX1, y1: newY1, x2: newX2, y2: newY2});
            break;

    }


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