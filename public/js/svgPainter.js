var Painter = function (svgId) {

    var self = this;

    this.svg = document.getElementById(svgId); // svg 元素
    this.elements = []; // SVG 包含的所有元素,在元素添加时加入数组,删除时移出数组
    this.nowId = 1; // id 累加器,为每个元素赋值唯一的 id

    this.color = 'green'; // 当前选择的颜色
    this.width = '10'; // 当前选择的线条粗细
    this.target = null; // 记录当前鼠标所在的元素
    this.shape = 'path';
    this.fontSize = '16px';

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

    // 本数组存储所有的 path
    // [{id: '', d:[{mx:0,my:0,lx:0,ly:0}]}]
    this.pathArr = [];
    // 本数组存储所有的 transform
    // [{id: '', transform: [{translate: '150 170'}]}];
    this.transformArr = [];

    // diff 监听器,会在图形有变动的时候,将 diff 传入函数的参数
    this.onDiff = null;

    this.svg.addEventListener('mouseenter', function (e) {
        self.target = self.svg;
    }, false);

    this.svg.addEventListener('mouseleave', function (e) {
        e.target.style.cursor = 'default';
    }, false);

    this.svg.addEventListener('mousemove', function (e) {

        // 清除鼠标样式
        self.clearMouse();

        // 设置鼠标样式
        if (e.target !== self.svg && !self.draging) {
            self.target = e.target;
            self.target.style.cursor = 'move';
        }

        // 这里主要主要的拖动操作
        if (self.draging) {
            self.move(self.target, e.clientX, e.clientY);
        }

        // 这里主要是绘图的操作
        if (self.drawing) {
            self.draw(self.drawStartX, self.drawStartY, e.clientX, e.clientY);
        }

    }, false);

    this.svg.addEventListener('click', function (e) {
        if (e.target === self.target && e.target !== self.svg) {
            self.addHandleBar(e.target);
        }
    }, false);

    this.svg.addEventListener('mousedown', function (e) {

        self.moveStartX = e.clientX;
        self.moveStartY = e.clientY;

        if (self.target !== self.svg && e.target === self.target) {
            self.draging = true;
        } else {
            self.drawing = true;
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
    if (id != undefined) {
        id = id;
    } else {
        id = this.nowId;
        this.nowId++;
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

    shape.setAttribute('fill', this.color);
    shape.setAttribute('stroke-linecap', 'round');

    this.svg.appendChild(shape);
    this.elements.push(shape);

    this.diff('add', shape);

    console.log(this.elements);

    return shape;

};

// 每次增删改差的时候调用,比较本次和上次的差异,方便增量更新
Painter.prototype.diff = function (action, element, keyValue) {

    var diff = null;
    if (action === 'add') {

        // 这里要先进行断点,否则,会出现接着上次画的问题
        this.tempDrawingShap = null;

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

    } else if (action === 'clear') {
        diff = {
            action: action
        };
    } else if (action === 'transform') {
        diff = {
            action: action,
            elementId: element.id,
            data: keyValue
        };
    }

    if (this.onDiff) {
        this.onDiff(diff);
    }

}

// 改变x 和 y,将对应的元素移动
Painter.prototype.move = function (element, toX, toY) {

    var self = this;

    // 求 offset
    this.offsetX = toX - this.moveStartX;
    this.offsetY = toY - this.moveStartY;

    // 刷新起止点
    this.moveStartX = toX;
    this.moveStartY = toY;

    // 将switch 改为 if
    // 圆形和椭圆是公用的
    if (this.target.tagName == 'ellipse' || this.target.tagName == 'circle') {
        var newX = parseInt(element.getAttribute('cx')) + parseInt(this.offsetX);
        element.setAttribute('cx', newX);
        var newY = parseInt(element.getAttribute('cy')) + parseInt(this.offsetY);
        element.setAttribute('cy', newY);
        this.diff('modify', this.target, {cx: newX, cy: newY});
    } else if (this.target.tagName == 'rect' || this.target.tagName == 'text') {
        var newX = parseInt(element.getAttribute('x')) + parseInt(this.offsetX);
        element.setAttribute('x', newX);
        var newY = parseInt(element.getAttribute('y')) + parseInt(this.offsetY);
        element.setAttribute('y', newY);
        this.diff('modify', this.target, {x: newX, y: newY});
    } else if (this.target.tagName == 'line') {
        var newX1 = parseInt(element.getAttribute('x1')) + parseInt(this.offsetX);
        element.setAttribute('x1', newX1);
        var newY1 = parseInt(element.getAttribute('y1')) + parseInt(this.offsetY);
        element.setAttribute('y1', newY1);
        var newX2 = parseInt(element.getAttribute('x2')) + parseInt(this.offsetX);
        element.setAttribute('x2', newX2);
        var newY2 = parseInt(element.getAttribute('y2')) + parseInt(this.offsetY);
        element.setAttribute('y2', newY2);
        this.diff('modify', this.target, {x1: newX1, y1: newY1, x2: newX2, y2: newY2});
    } else if (this.target.tagName == 'path') {

        // path 比较特别,用的是 transform 来移动图形,他的 x 和 y 属性并不是自带的
        var newX = parseInt(element.getAttribute('x')) + parseInt(this.offsetX);
        var newY = parseInt(element.getAttribute('y')) + parseInt(this.offsetY);

        this.transform('translate', newX + ' ' + newY, element);

        element.setAttribute('x', newX)
        element.setAttribute('y', newY)
    }

}

// transform 的封装,用来替代 move
Painter.prototype.transform = function (key, value, element) {

    // 是否新增id 和 transform 的标志位
    var addFlag = true;
    var tempTransformArr = []; // 用来存储本 element 对应的全部 transform

    // 遍历数组
    for (var i = 0; i < this.transformArr.length; i++) {

        // 在 id 里面作修改
        if (this.transformArr[i].id == element.id) {

            addFlag = false;
            transformId = element.id;

            // 遍历 transform 数组,有则覆盖,无则新增
            var attrAddFlag = true;// 属性存在的标志
            for (var j = 0; j < this.transformArr[i].transform.length; j++) {


                if (this.transformArr[i].transform[j].hasOwnProperty(key)) {

                    attrAddFlag = false;

                    var o = {};
                    o[key] = value;

                    this.transformArr[i].transform[j] = o;

                }
            }

            if (attrAddFlag) {

                var o = {};
                o[key] = value;

                this.transformArr[i].transform.push(o);
            }
            tempTransformArr = this.transformArr[i].transform;

        }
    }

    // 增加一个 id 和 transform
    if (addFlag) {

        var o = {};
        o[key] = value;

        this.transformArr.push({id: element.id, transform: [o]});

        tempTransformArr = [o];

    }

    // 将 transform 数组转换成属性
    // 操作对象为elementid 指定的对象
    var transformTxt = '';
    for (var k = 0; k < tempTransformArr.length; k++) {
        for (transName in tempTransformArr[k]) {
            transformTxt += transName + '(' + tempTransformArr[k][transName] + ') ';
        }
    }

    element.setAttribute('transform', transformTxt);

    this.diff('transform', this.target, {transform: transformTxt});
};

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
    if (this.shape == 'line') {

        // line 的增量是变化的,每一次移动都在变
        this.offsetX = clientX - this.moveStartX;
        this.offsetY = clientY - this.moveStartY;

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.line(startX, startY, startX, startY);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.shape == 'rect') {

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.rect(startX, startY, 0, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.shape == 'circle') {
        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.circle(startX - this.offsetX, startY - this.offsetY, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.shape == 'ellipse') {

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.ellipse(startX, startY, 0, 0);
        } else {
            this.fresh(this.tempDrawingShap, clientX, clientY);
        }
    } else if (this.shape == 'path') {

        // path 同 line
        this.offsetX = clientX - this.moveStartX;
        this.offsetY = clientY - this.moveStartY;

        if (!this.tempDrawingShap) {
            this.tempDrawingShap = this.path(startX, startY, 0, 0);
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

    attr.stroke = this.color;
    attr['stroke-width'] = this.width;

    var shape = this.fill('line', attr);
    return shape;
};

Painter.prototype.text = function (x, y, text) {
    var attr = this.attr('x', 'y', 'innerHTML', arguments);

    attr.stroke = this.color;
    attr.strokeWidth = this.width;

    var shape = this.fill('text', attr);
    return shape;
};

// path 比较特殊,只有一个 d 属性,那么其属性需要存储为数组,然后由数组来渲染
Painter.prototype.path = function (x, y, toX, toY, path) {

    // 这里是刷新已存在的 path,可能是持续画笔,可能是移动
    if (path) {

        // 遍历寻找 id,然后刷新 id 对应的数据
        for (var i = 0; i < this.pathArr.length; i++) {

            if (this.pathArr[i].id == path.id) {

                this.pathArr[i].d.push({mx: x, my: y, lx: toX, ly: toY});

                var d = path.getAttribute('d');
                d += ' m ' + x + ' ' + y;
                d += ' l ' + toX + ' ' + toY;

                path.setAttribute('d', d);

                this.diff('modify', path, {mx: x, my: y, lx: toX, ly: toY});

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

        var shape = this.fill('path', {d: tempStr, stroke: this.color}, id);
        shape.setAttribute('stroke-width', this.width);
        shape.setAttribute('x', 0);
        shape.setAttribute('y', 0);
        this.nowId++;
        return shape;

    }

};

// diff 的渲染器,得到 diff 后将 diff 绘制在图中,实现图形的同步
Painter.prototype.drawDiff = function (diff) {

    if (diff.action === 'add') {

        var shape = document.createElementNS('http://www.w3.org/2000/svg', diff.data.tagName);
        shape.id = diff.elementId;

        for (var i in diff.data.attributes) {

            if (i === 'innerHTML') {
                shape.innerHTML = diff.data.attributes[i];
            } else {
                shape.setAttribute(i, diff.data.attributes[i]);
            }

        }

        shape.setAttribute('fill', this.color);

        svg.appendChild(shape);
        this.nowId++;

        this.elements.push(shape);

        console.log(this.elements);

    } else if (diff.action === 'modify') {

        var ele = svg.getElementById(diff.elementId.toString());

        if (ele.tagName == 'path') {

            var d = ele.getAttribute('d');

            d += ' m ' + diff.data.mx + ' ' + diff.data.my;
            d += ' l ' + diff.data.lx + ' ' + diff.data.ly;

            ele.setAttribute('d', d);

            ele.setAttribute('stroke-width', this.width);
        } else if (ele.tagName == 'line') {
            for (var x in diff.data) {
                ele.setAttribute(x, diff.data[x])
            }
            ele.setAttribute('stroke-width', this.width);
        } else {
            for (var x in diff.data) {
                ele.setAttribute(x, diff.data[x])
            }
        }

    } else if (diff.action === 'transform') {
        var ele = svg.getElementById(diff.elementId.toString());
        ele.setAttribute('transform', diff.data.transform);
    } else if (diff.action === 'clear') {
        this.clear();
    }

}

// clear 这个方法用来清空全部图形,主要用来橡皮擦的全部删除,以及在网页调试的时候的刷新后调用
Painter.prototype.clear = function () {

    // 1.清除已经绘画的全部元素
    // 2.将缓存的数组和状态复位
    while (svg.hasChildNodes()) {
        svg.removeChild(svg.firstChild);
    }

    this.elements = [];
    this.nowId = 1;
    this.pathArr = [];
    this.draging = false;
    this.drawing = false;
    this.tempDrawingShap = null;

}

Painter.prototype.saveAsFile = function () {

    var imgData = 'data:image/svg+xml;base64,' + btoa(this.svg.outerHTML);

    imgData = imgData.replace('image/svg', 'image/octet-stream');

    var date = new Date();
    var year = date.getFullYear();
    var month = date.getMonth() + 1 > 9 ? date.getMonth() + 1 : '0' + (date.getMonth() + 1);
    var day = date.getDate() > 9 ? date.getDate() : '0' + date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();

    var filename = 'Websocket_drawing_board_image_' + year + month + day + hour + minute + second + '.svg';

    var event = new MouseEvent('click', {
        'view': window,
        'bubbles': true,
        'cancelable': true
    });

    var saveLink = document.createElementNS('http://www.w3.org/1999/xhtml', 'a');
    saveLink.href = imgData;
    saveLink.download = filename;

    saveLink.dispatchEvent(event);

}

// 这里用 div 来添加 bar 和边框
Painter.prototype.addHandleBar = function (ele) {

    var mask = document.getElementById('svg-websocket-board-mask');
    mask.style.zIndex = '1000';

    var handle1 = document.getElementById('handle1');
    var handle2 = document.getElementById('handle2');
    var handle3 = document.getElementById('handle3');
    var handle4 = document.getElementById('handle4');


    var clientRect = ele.getBoundingClientRect();

    // 顺时针旋转
    handle1.style.left = clientRect.left -10 + 'px';
    handle1.style.top = clientRect.top -10 + 'px';

    handle2.style.left = clientRect.left + clientRect.width + 'px';
    handle2.style.top = clientRect.top -10 + 'px';

    handle3.style.left = clientRect.left + clientRect.width + 'px';
    handle3.style.top = clientRect.top + clientRect.height + 'px';

    handle4.style.left = clientRect.left - 10 + 'px';
    handle4.style.top = clientRect.top + clientRect.height + 'px';

}