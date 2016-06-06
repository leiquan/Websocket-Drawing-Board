var Painter = function (svgId) {

    var self = this;

    this.svg = document.getElementById(svgId); // svg 元素
    this.elements = []; // SVG 包含的所有元素,在元素添加时加入数组,删除时移出数组
    this.nowId = 1; // id 累加器,为每个元素赋值唯一的 id
    this.nowColor = 'black'; // 当前选择的颜色
    this.nowWidth = '2'; // 当前选择的线条粗细
    this.nowElement = null; // 记录当前鼠标所在的元素
    this.nowShape = 'path';
    this.nowFontSize = '16px';
    this.draging = false; //鼠标是否正在拖动某个元素
    this.drawing = false; // 是否正在绘画过程中
    this.tempDrawingShap = null; // 缓存的正在绘画的图形的引用

    // 拖动开始的时候,记录坐标,并且此坐标随着鼠标移动而变动,用来记录每次移动的 offset
    this.moveStartX = 0;
    this.moveStartY = 0;

    // 绘图开始的时候,记录坐标,并且此坐标不会随着拖动而变动
    this.drawStartX = 0;
    this.drawStartY = 0;


    // 鼠标移动过程中的偏移坐标
    this.offsetX = 0;
    this.offsetY = 0;

    // 本对象存储所有的 path
    // 数据结构:
    // [{id: '', d:[{mx:0,my:0,lx:0,ly:0}]}]
    this.pathArr = [];

    this.onChangeListener = null;

    this.svg.addEventListener('mouseenter', function (e) {
        self.nowElement = self.svg;
    }, false);

    this.svg.addEventListener('mouseleave', function (e) {
        e.target.style.cursor = 'default';
    }, false);

    this.svg.addEventListener('mousemove', function (e) {

        // 清除鼠标样式
        self.clearMouse();

        // 设置鼠标样式
        if (e.target !== self.svg && !self.draging) {
            self.nowElement = e.target;
            self.nowElement.style.cursor = 'move';
        }

        // 这里主要主要的拖动操作
        if (self.draging) {
            self.move(self.nowElement, e.clientX, e.clientY);
        }

        // 这里主要是绘图的操作
        if (self.drawing) {
            self.draw(self.drawStartX, self.drawStartY, e.clientX, e.clientY);
        }

    }, false);

    this.svg.addEventListener('click', function (e) {
        if (e.target === self.nowElement) {
        }
    }, false);

    this.svg.addEventListener('mousedown', function (e) {

        self.moveStartX = e.clientX;
        self.moveStartY = e.clientY;

        if (self.nowElement !== self.svg && e.target === self.nowElement) {
            self.draging = true;
        } else {
            self.drawing = true;
            console.log('开始画图');
            self.drawStartX = e.clientX;
            self.drawStartY = e.clientY;
        }

    }, false);

    this.svg.addEventListener('mouseup', function (e) {

        if (self.draging) {
            self.draging = false;
        }

        if (self.drawing == true) {
            self.drawing = false;
            console.log('结束画图');
            self.tempDrawingShap = null;
        }

    }, false);

};


// 计算两坐标点之间的直线距离
Painter.prototype.distance = function (x1, y1, x2, y2) {

    var calX = x2 - x1;
    var calY = y2 - y1;

    return Math.pow((calX * calX + calY * calY), 0.5);

}

// 任何一个图形需要一个唯一的 id,方便在 diff 的时候索引
Painter.prototype.fill = function (shape, attr, id) {
    if (id) {
        id = id;
    } else {
        this.nowId++;
        id = this.nowId;
    }


    var shape = document.createElementNS('http://www.w3.org/2000/svg', shape);
    shape.id = id;

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

    return shape;

};

// 设置改动的监听器,当图形有变化的时候,会把 diff 传进去
Painter.prototype.setChangeListener = function (listener) {
    this.onChangeListener = listener;
};

// 每次增删改差的时候调用,比较本次和上次的差异,方便增量更新
Painter.prototype.diff = function (action, element, keyValue) {
    // 如何 diff?
    // svg 由属性组成,遍历属性,找到变动
    // 当增删改差的时候调用 diff 即可,记录下 diff 的属性值
    // action 直接记录修改行为,增删改查
    var diff = null;
    if (action === 'add') {

        // 得到 attr 数组:
        var attr = {};

        for (var x in element.attributes) {

            if (element.attributes.hasOwnProperty(element.attributes[x].name)) {
                attr[element.attributes[x].name] = element.attributes[x].nodeValue;
            }

        }

        diff = {
            action: action,
            elementId: element.id,
            data: {
                tagName: element.tagName,
                attributes: attr

            }
        };

    } else if (action === 'modify') {
        diff = {
            action: action,
            elementId: element.id,
            data: keyValue
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
    this.offsetX = toX - this.moveStartX;
    this.offsetY = toY - this.moveStartY;

    // 刷新起止点
    this.moveStartX = toX;
    this.moveStartY = toY;

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

        // path 的移动比较特殊,无法调用 xy 来移动,需要重新绘制图形
        case 'path':
            console.log('path 的移动比较特殊,无法调用 xy 来移动,需要重新绘制图形');
            break;

    }


}

// 刷新一个图形,注意,起点不变,只变终点,并且需要处理重点的映射关系
Painter.prototype.fresh = function (element, clientX, clientY) {

    // 刷新起止点
    this.moveStartX = clientX;
    this.moveStartY = clientY;

    switch (element.tagName) {

        case 'line':

            var newX2 = parseInt(element.getAttribute('x2')) + parseInt(this.offsetX);
            element.setAttribute('x2', newX2);
            var newY2 = parseInt(element.getAttribute('y2')) + parseInt(this.offsetY);
            element.setAttribute('y2', newY2);
            this.diff('modify', element, {x2: newX2, y2: newY2});
            break;

        case 'rect':
            // TODO:注意一点,如果为负数,那么需要更换顶点坐标哈哈
            var newWidth = Math.abs(parseInt(element.getAttribute('x')) + this.offsetX - this.drawStartX);
            element.setAttribute('width', newWidth);
            var newHeight = Math.abs(parseInt(element.getAttribute('y')) + this.offsetY - this.drawStartY);
            element.setAttribute('height', newHeight);
            this.diff('modify', element, {width: newWidth, height: newHeight});
            break;

        case 'circle':
            var newR = this.distance(this.drawStartX, this.drawStartY, clientX, clientY);
            element.setAttribute('r', newR);
            this.diff('modify', element, {r: newR});
            break;

        case 'ellipse':
            var newWidth = Math.abs(parseInt(element.getAttribute('cx')) + this.offsetX - this.drawStartX);
            element.setAttribute('rx', newWidth);
            var newHeight = Math.abs(parseInt(element.getAttribute('cy')) + this.offsetY - this.drawStartY);
            element.setAttribute('ry', newHeight);
            this.diff('modify', element, {rx: newWidth, ry: newHeight});
            break;

        case 'path':
            // 这里需要求偏移量
            this.path(0, 0, this.offsetX, this.offsetY, element);
            break;

    }
};

// 不同的图形,在处理上并不一样,并且这里只要一个图形的 instance
Painter.prototype.draw = function (startX, startY, clientX, clientY) {

    // 求 offset
    this.offsetX = clientX - this.drawStartX;
    this.offsetY = clientY - this.drawStartY;

    // 线段,直接看做起点和终点
    if (this.nowShape == 'line') {

        // line 的增量是变化的,每一次移动都在变
        this.offsetX = clientX - this.moveStartX;
        this.offsetY = clientY - this.moveStartY;

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.line(startX, startY, startX, startY);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.nowShape == 'rect') {

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.rect(startX, startY, 0, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.nowShape == 'circle') {
        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.circle(startX - this.offsetX, startY - this.offsetY, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.nowShape == 'ellipse') {

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.ellipse(startX, startY, 0, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.nowShape == 'path') {
        // path 同 line
        this.offsetX = clientX - this.moveStartX;
        this.offsetY = clientY - this.moveStartY;

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.path(startX, startY, 0, 0);
            console.log(this.tempDrawingShap);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }

    }

}

// 清除鼠标
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
    var shape = this.fill('circle', attr);
    return shape;
};

Painter.prototype.ellipse = function (cx, cy, rx, ry) {
    var attr = this.attr('cx', 'cy', 'rx', 'ry', arguments);
    var shape = this.fill('ellipse', attr);
    return shape;
};

Painter.prototype.rect = function (x, y, width, height) {
    var attr = this.attr('x', 'y', 'width', 'height', arguments);
    var shape = this.fill('rect', attr);
    return shape;
};

Painter.prototype.line = function (x1, y1, x2, y2) {
    var attr = this.attr('x1', 'y1', 'x2', 'y2', arguments);

    attr.stroke = this.nowColor;
    attr.strokeWidth = this.nowWidth;

    var shape = this.fill('line', attr);
    return shape;
};

Painter.prototype.text = function (x, y, text) {
    var attr = this.attr('x', 'y', 'innerHTML', arguments);

    attr.stroke = this.nowColor;
    attr.strokeWidth = this.nowWidth;

    var shape = this.fill('text', attr);
    return shape;
};

// path 比较特殊,只有一个 d 属性,那么其属性需要存储为数组,然后由数组来渲染
Painter.prototype.path = function (x, y, toX, toY, path) {

    // 这里是刷新已存在的 path,可能是持续画笔,可能是移动
    if (path) {

        // 遍历寻找 id,然后刷新 id 对应的数据
        for (var i = 0; i < this.pathArr.length; i++) {

            console.log(this.pathArr[i].id);
            console.log(path.id);

            if (this.pathArr[i].id == path.id) {
                console.log('进入到了这里');
                this.pathArr[i].d.push({mx: x, my: y, lx: toX, ly: toY});

                var d = path.getAttribute('d');
                d += ' m ' + x + ' ' + y;
                d += ' l ' + toX + ' ' + toY;

                path.setAttribute('d', d);

            }
        }

    }
    // 新建
    else {
        // 数据拼接
        var tempStr = '';
        var id = this.nowId;
        var data = {};
        data.id = id;
        data.d = [];
        data.d.push({mx: x, my: y, lx: toX, ly: toY});
        this.pathArr.push(data);

        tempStr += ' m ' + x + ' ' + y;
        tempStr += ' l ' + toX + ' ' + toY;

        var shape = this.fill('path', {d: tempStr, stroke: this.nowColor, strokeWidth: this.nowWidth}, id);
        this.nowId++;
        return shape;

    }


    //return shape;

};