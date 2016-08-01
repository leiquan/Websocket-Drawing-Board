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
    this.moving = false; // 这个标志主要用来在移动时候触发,延时消失,主要用来控制菜单的显示
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

    // 这里存储操作的相关元素
    this.mask = null;
    this.handle1 = null;
    this.handle2 = null;
    this.handle3 = null;
    this.handle4 = null;

    // diff 监听器,会在图形有变动的时候,将 diff 传入函数的参数
    this.onDiff = null;

    // svg 事件处理

    this.svg.addEventListener('mouseenter', function (e) {
        self.target = self.svg;
    }, false);

    this.svg.addEventListener('mouseleave', function (e) {
        e.target.style.cursor = 'default';
    }, false);

    this.svg.addEventListener('mousemove', function (e) {

        if (Math.abs(e.clientX - self.moveStartX) > 10 || Math.abs(e.clientY - self.moveStartY) > 10) {
            if (self.draging) {
                self.moving = true;
            }
        }

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
            self.tempDrawingShap = null;
        } else {
            setTimeout(function () {

                if (!self.moving && !self.drawing) {
                    if (e.target === self.target && e.target !== self.svg && !self.draging) {
                        self.showHandleBar(e.target);
                    }
                }

                self.moving = false;
            }, 300);
        }

    }, false);

    // 初始化
    this.appendHandleBar();

};

// 任何一个图形需要一个唯一的 id,方便在 diff 的时候索引,此函数新增是否实心的选项
Painter.prototype.fill = function (shape, attr, isHollow, id) {

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

    if (isHollow) {
        shape.setAttribute('fill', 'transparent');
        shape.setAttribute('stroke', this.color);
        shape.setAttribute('stroke-width', this.width);
    } else {
        shape.setAttribute('fill', this.color);
    }

    if (shape.tagName == 'path') {
        shape.setAttribute('stroke-linecap', 'round');
    }

    // transform 要用到的位置偏移坐标
    shape.setAttribute('offsetX', 0);
    shape.setAttribute('offsetY', 0);

    this.svg.appendChild(shape);
    this.elements.push(shape);

    this.diff('add', shape);

    return shape;

};

// 每次增删改的时候调用,将差异数据传入 diff listener
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
            data: keyValue,
            offsetX: element.getAttribute('offsetX'),
            offsetY: element.getAttribute('offsetY')
        };
    }

    if (this.onDiff) {
        this.onDiff(diff);
    }

}

// 这个函数升级为通过 offsetX 和 offsetY来设置transform
Painter.prototype.move = function (element, toX, toY) {

    // 求 offset
    this.offsetX = toX - this.moveStartX;
    this.offsetY = toY - this.moveStartY;

    // 刷新起止点
    this.moveStartX = toX;
    this.moveStartY = toY;

    var newX = parseInt(element.getAttribute('offsetX')) + parseInt(this.offsetX);
    var newY = parseInt(element.getAttribute('offsetY')) + parseInt(this.offsetY);

    this.transform('translate', newX + ' ' + newY, element);

    element.setAttribute('offsetX', newX.toString());
    element.setAttribute('offsetY', newY.toString());

}

// transform 的封装,代替原来的 move
Painter.prototype.transform = function (key, value, element) {

    // 是否新增id 和 transform 的标志位
    var addFlag = true;
    var tempTransformArr = []; // 用来存储本 element 对应的全部 transform

    // 遍历数组
    for (var i = 0; i < this.transformArr.length; i++) {

        // 在 id 里面作修改
        if (this.transformArr[i].id == element.id) {

            addFlag = false;

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

        this.transformArr.push({ id: element.id, transform: [o] });

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

    this.diff('transform', this.target, { transform: transformTxt });
};

// resize 用来在操作弹窗出现后,放大和缩小用
Painter.prototype.resize = function (element, e) {
    // 拿到元素
    // 解析鼠标事件
    // 进行操作
}

// 刷新一个图形,主要用来放大或者缩小
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
            this.diff('modify', element, { x2: newX2, y2: newY2 });
            break;

        case 'rect':
            // TODO:注意一点,如果为负数,那么需要更换顶点坐标哈哈
            var newWidth = Math.abs(parseInt(element.getAttribute('x')) + this.offsetX - this.drawStartX);
            element.setAttribute('width', newWidth);
            var newHeight = Math.abs(parseInt(element.getAttribute('y')) + this.offsetY - this.drawStartY);
            element.setAttribute('height', newHeight);
            this.diff('modify', element, { width: newWidth, height: newHeight });
            break;

        case 'circle':
            var newR = this.distance(this.drawStartX, this.drawStartY, clientX, clientY);
            element.setAttribute('r', newR);
            this.diff('modify', element, { r: newR });
            break;

        case 'ellipse':
            var newWidth = Math.abs(parseInt(element.getAttribute('cx')) + this.offsetX - this.drawStartX);
            element.setAttribute('rx', newWidth);
            var newHeight = Math.abs(parseInt(element.getAttribute('cy')) + this.offsetY - this.drawStartY);
            element.setAttribute('ry', newHeight);
            this.diff('modify', element, { rx: newWidth, ry: newHeight });
            break;

        case 'path':
            // 这里需要求偏移量
            this.path(0, 0, this.offsetX, this.offsetY, element);
            break;

    }
};

// 不同的图形,在处理上并不一样,并且这里只要一个图形的instance
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
};// 计算两坐标点之间的直线距离

// 计算两点之间的距离
Painter.prototype.distance = function (x1, y1, x2, y2) {

    var calX = x2 - x1;
    var calY = y2 - y1;

    return Math.pow((calX * calX + calY * calY), 0.5);

}

Painter.prototype.circle = function (cx, cy, r) {
    var attr = this.attr('cx', 'cy', 'r', arguments);
    var shape = this.fill('circle', attr, true);
    return shape;
};

Painter.prototype.ellipse = function (cx, cy, rx, ry) {
    var attr = this.attr('cx', 'cy', 'rx', 'ry', arguments);
    var shape = this.fill('ellipse', attr, true);
    return shape;
};

Painter.prototype.rect = function (x, y, width, height) {
    var attr = this.attr('x', 'y', 'width', 'height', arguments);
    var shape = this.fill('rect', attr, true);
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

                this.pathArr[i].d.push({ mx: x, my: y, lx: toX, ly: toY });

                var d = path.getAttribute('d');
                d += ' m ' + x + ' ' + y;
                d += ' l ' + toX + ' ' + toY;

                path.setAttribute('d', d);

                this.diff('modify', path, { mx: x, my: y, lx: toX, ly: toY });

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
        data.d.push({ mx: x, my: y, lx: toX, ly: toY });
        this.pathArr.push(data);

        tempStr += ' m ' + x + ' ' + y;
        tempStr += ' l ' + toX + ' ' + toY;

        var shape = this.fill('path', { d: tempStr, stroke: this.color }, id);
        shape.setAttribute('stroke-width', this.width);
        this.nowId++;
        return shape;

    }

};

// diff 的渲染器,得到 diff 后将 diff 绘制在图中,实现图形的同步
Painter.prototype.drawDiff = function (diff) {

    // 隐藏可能显示的 handleBar
    this.hideHandleBar();

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

        svg.appendChild(shape);
        this.nowId++;

        this.elements.push(shape);

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

        ele.setAttribute('offsetX', diff.data.offsetX);
        ele.setAttribute('offsetY', diff.data.offsetY);

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

// 封装函数，用来在 svg 的后面插入一个 div
Painter.prototype.appendHandleBar = function () {

    var self = this;

    // 添加mask父容器
    var parent = this.svg.parentNode;

    this.mask = document.createElement('div');
    this.mask.id = 'svg-websocket-board-mask';
    this.mask.style.width = this.svg.clientWidth + 'px';
    this.mask.style.height = this.svg.clientHeight + 'px';
    this.mask.style.position = 'absolute';
    this.mask.style.top = '0px';
    this.mask.style.left = '0px';
    this.mask.style.zIndex = '-1';

    var next = svg.nextSibling;

    if (next) {
        parent.insertBefore(this.mask, next);
    } else {
        parent.appendChild(this.mask);
    }

    // 添加四个 handlebar,从左上角顺时针
    this.handle1 = document.createElement('div');
    this.handle1.id = 'svg-websocket-board-handle1';
    this.handle1.style.cursor = 'nw-resize';

    this.handle2 = document.createElement('div');
    this.handle2.id = 'svg-websocket-board-handle2';
    this.handle2.style.cursor = 'ne-resize';

    this.handle3 = document.createElement('div');
    this.handle3.id = 'svg-websocket-board-handle3';
    this.handle3.style.cursor = 'se-resize';

    this.handle4 = document.createElement('div');
    this.handle4.id = 'svg-websocket-board-handle4';
    this.handle4.style.cursor = 'sw-resize';

    var style = {
        width: "10px",
        height: "10px",
        backgroundColor: 'white',
        border: '1px solid #333',
        boxSizing: 'border-box',
        position: 'absolute',
        zIndex: '1200'
    };

    for (var i in style) {
        this.handle1.style[i] = style[i];
        this.handle2.style[i] = style[i];
        this.handle3.style[i] = style[i];
        this.handle4.style[i] = style[i];
    }

    this.mask.appendChild(this.handle1);
    this.mask.appendChild(this.handle2);
    this.mask.appendChild(this.handle3);
    this.mask.appendChild(this.handle4);



    /**
     * 以下是对操作 bar 的鼠标处理
     */
    // bar 操作所需要的变量
    var maskMouseMoveHandler = function (e) {
        console.log(e);
    }

    // 鼠标事件初始化
    this.mask.addEventListener('mousedown', function (e) {

        // 只允许在四个方框内点击和操作,其他地方取消操作
        if (e.target.id !== 'svg-websocket-board-handle1' && e.target.id !== 'svg-websocket-board-handle2' && e.target.id !== 'svg-websocket-board-handle3' && e.target.id !== 'svg-websocket-board-handle4') {
            self.hideHandleBar();
        }

        else //执行到了这里啊,等于,那么就要处理四个定点拉 
        {

            // 第二个定点比较简单，先处理这个
            if (e.target.id == 'svg-websocket-board-handle2') {

                // 添加鼠标移动的处理
                self.mask.addEventListener('mousemove', maskMouseMoveHandler, false);

            }

        }
    }, false);

    // 在鼠标抬起的时候，我们移除鼠标的移动事件
    this.mask.addEventListener('mouseup', function (e) {
        self.mask.removeEventListener('mousemove', maskMouseMoveHandler, false);
        console.log('移除了');
    }, false);


    // 注释掉下面四个点的坐标，将时间绑定移到 mask 上，否则鼠标会很容易就出去了
    // // 这里是对坐标的记录
    // // mouse down 时候的坐标缓存记录,
    // var barStartX = 0;
    // var barStartY = 0;
    // var barDiffX = 0;
    // var barDiffY = 0;
    // var barStartLeft = 0;
    // var barStartTop = 0;


    // // 四个 handle 的鼠标操作处理
    // var mouseDownHandle = function (e) {
    //     // 首先,要记录下坐标
    //     barStartX = e.clientX;
    //     barStartY = e.clientY;

    //     // 鼠标 down 的时候刷新 left 和 top
    //     barStartLeft = parseInt(self.handle2.style.left);
    //     barStartTop = parseInt(self.handle2.style.top);


    //     this.addEventListener('mousemove', mouseMoveHandle, false);
    // }

    // var mouseMoveHandle = function (e) {

    //     // 首先,计算偏移量
    //     // 然后,移动小方块元素
    //     barDiffX = e.clientX - barStartX;

    //     // 移动小方块和线条,是要分情况讨论的,要区分是都需要移动顶点位置
    //     // 右上角不需要,先从右上角入手
    //     self.handle2.style.left = barStartLeft + barDiffX + 'px';
    //     self.handle2.style.top = barStartTop + barDiffY + 'px';

    // }

    // var mouseUpHandle = function (e) {
    //     console.log('mouse up');
    //     this.removeEventListener('mousemove', mouseMoveHandle, false);
    // }

    // this.handle1.addEventListener('mousedown', mouseDownHandle, false);
    // this.handle2.addEventListener('mousedown', mouseDownHandle, false);
    // this.handle3.addEventListener('mousedown', mouseDownHandle, false);
    // this.handle4.addEventListener('mousedown', mouseDownHandle, false);

    // this.handle1.addEventListener('mouseup', mouseUpHandle, false);
    // this.handle2.addEventListener('mouseup', mouseUpHandle, false);
    // this.handle3.addEventListener('mouseup', mouseUpHandle, false);
    // this.handle4.addEventListener('mouseup', mouseUpHandle, false);

    // 添加一个边框,和四个顶点连接起来
    this.barLine = document.createElement('div');
    this.barLine.id = 'svg-websocket-board-bar-line';
    this.barLine.style.position = 'absolute';
    this.barLine.style.zIndex = '1100';
    this.mask.appendChild(this.barLine);

    // 添加一个旋转的手柄,放在边框的正中间的位置
    this.rotateBar = document.createElement('div');
    this.rotateBar.id = 'svg-websocket-board-rotate-bar';
    this.rotateBar.style.position = 'absolute';
    this.rotateBar.style.width = '20px';
    this.rotateBar.style.height = '20px';
    this.rotateBar.style.borderRadius = '20px';
    this.rotateBar.style.backgroundImage = 'url(data:image/jpg;base64,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AAAAAEdybiBkb3ViQG/gAAAAAAAAAAAAQmwgIGRvdWJAb+AAAAAAAAAAAABCcmRUVW50RiNSbHQAAAAAAAAAAAAAAABCbGQgVW50RiNSbHQAAAAAAAAAAAAAAABSc2x0VW50RiNQeGxAUgAAAAAAAAAAAAp2ZWN0b3JEYXRhYm9vbAEAAAAAUGdQc2VudW0AAAAAUGdQcwAAAABQZ1BDAAAAAExlZnRVbnRGI1JsdAAAAAAAAAAAAAAAAFRvcCBVbnRGI1JsdAAAAAAAAAAAAAAAAFNjbCBVbnRGI1ByY0BZAAAAAAAAAAAAEGNyb3BXaGVuUHJpbnRpbmdib29sAAAAAA5jcm9wUmVjdEJvdHRvbWxvbmcAAAAAAAAADGNyb3BSZWN0TGVmdGxvbmcAAAAAAAAADWNyb3BSZWN0UmlnaHRsb25nAAAAAAAAAAtjcm9wUmVjdFRvcGxvbmcAAAAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCYAAAAAAA4AAAAAAAAAAAAAP4AAADhCSU0EDQAAAAAABAAAAB44QklNBBkAAAAAAAQAAAAeOEJJTQPzAAAAAAAJAAAAAAAAAAABADhCSU0nEAAAAAAACgABAAAAAAAAAAI4QklNA/UAAAAAAEgAL2ZmAAEAbGZmAAYAAAAAAAEAL2ZmAAEAoZmaAAYAAAAAAAEAMgAAAAEAWgAAAAYAAAAAAAEANQAAAAEALQAAAAYAAAAAAAE4QklNA/gAAAAAAHAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAOEJJTQQIAAAAAAAQAAAAAQAAAkAAAAJAAAAAADhCSU0EHgAAAAAABAAAAAA4QklNBBoAAAAAAz8AAAAGAAAAAAAAAAAAAAAsAAAALAAAAAUAMgAuAHAAaQBjAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAsAAAALAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAABAAAAABAAAAAAAAbnVsbAAAAAIAAAAGYm91bmRzT2JqYwAAAAEAAAAA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LzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMwNjcgNzkuMTU3NzQ3LCAyMDE1LzAzLzMwLTIzOjQwOjQyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iOEY1REE2OThENzZBRUI2ODQ0MDA4RjREMzNCQjJCNUEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ZjgyYzQ2MTQtNmY2NS00MGQyLThhYzUtYWRjNDkyNTIwNTU2IiB4bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ9IjhGNURBNjk4RDc2QUVCNjg0NDAwOEY0RDMzQkIyQjVBIiBkYzpmb3JtYXQ9ImltYWdlL2pwZWciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJEaXNwbGF5IiB4bXA6Q3JlYXRlRGF0ZT0iMjAxNi0wNy0zMVQyMzoxOTo0OSswODowMCIgeG1wOk1vZGlmeURhdGU9IjIwMTYtMDctMzFUMjM6MjY6MDgrMDg6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMTYtMDctMzFUMjM6MjY6MDgrMDg6MDAiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDpmODJjNDYxNC02ZjY1LTQwZDItOGFjNS1hZGM0OTI1MjA1NTYiIHN0RXZ0OndoZW49IjIwMTYtMDctMzFUMjM6MjY6MDgrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE1IChNYWNpbnRvc2gpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDwvcmRmOlNlcT4gPC94bXBNTTpIaXN0b3J5PiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8P3hwYWNrZXQgZW5kPSJ3Ij8+/+IbKElDQ19QUk9GSUxFAAEBAAAbGGFwcGwCEAAAbW50clJHQiBYWVogB+AAAQAEAAsAAwAkYWNzcEFQUEwAAAAAQVBQTAAAAAAAAAAAAAAAAAAAAAAAAPbWAAEAAAAA0y1hcHBsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAARZGVzYwAAAVAAAABiZHNjbQAAAbQAAAQaY3BydAAABdAAAAAjd3RwdAAABfQAAAAUclhZWgAABggAAAAUZ1hZWgAABhwAAAAUYlhZWgAABjAAAAAUclRSQwAABkQAAAgMYWFyZwAADlAAAAAgdmNndAAADnAAAAYSbmRpbgAAFIQAAAY+Y2hhZAAAGsQAAAAsbW1vZAAAGvAAAAAoYlRSQwAABkQAAAgMZ1RSQwAABkQAAAgMYWFiZwAADlAAAAAgYWFnZwAADlAAAAAgZGVzYwAAAAAAAAAIRGlzcGxheQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAG1sdWMAAAAAAAAAIgAAAAxockhSAAAAFAAAAahrb0tSAAAADAAAAbxuYk5PAAAAEgAAAchpZAAAAAAAEgAAAdpodUhVAAAAFAAAAexjc0NaAAAAFgAAAgBkYURLAAAAHAAAAhZ1a1VBAAAAHAAAAjJhcgAAAAAAFAAAAk5pdElUAAAAFAAAAmJyb1JPAAAAEgAAAnZubE5MAAAAFgAAAohoZUlMAAAAFgAAAp5lc0VTAAAAEgAAAnZmaUZJAAAAEAAAArR6aFRXAAAADAAAAsR2aVZOAAAADgAAAtBza1NLAAAAFgAAAt56aENOAAAADAAAAsRydVJVAAAAJAAAAvRmckZSAAAAFgAAAxhtcwAAAAAAEgAAAy5jYUVTAAAAGAAAA0B0aFRIAAAADAAAA1hlc1hMAAAAEgAAAnZkZURFAAAAEAAAA2RlblVTAAAAEgAAA3RwdEJSAAAAGAAAA4ZwbFBMAAAAEgAAA55lbEdSAAAAIgAAA7BzdlNFAAAAEAAAA9J0clRSAAAAFAAAA+JqYUpQAAAADgAAA/ZwdFBUAAAAFgAABAQATABDAEQAIAB1ACAAYgBvAGoAac7st+wAIABMAEMARABGAGEAcgBnAGUALQBMAEMARABMAEMARAAgAFcAYQByAG4AYQBTAHoA7QBuAGUAcwAgAEwAQwBEAEIAYQByAGUAdgBuAP0AIABMAEMARABMAEMARAAtAGYAYQByAHYAZQBzAGsA5gByAG0EGgQ+BDsETAQ+BEAEPgQyBDgEOQAgAEwAQwBEIA8ATABDAEQAIAZFBkQGSAZGBikATABDAEQAIABjAG8AbABvAHIAaQBMAEMARAAgAGMAbwBsAG8AcgBLAGwAZQB1AHIAZQBuAC0ATABDAEQgDwBMAEMARAAgBeYF0QXiBdUF4AXZAFYA5AByAGkALQBMAEMARF9pgnIAIABMAEMARABMAEMARAAgAE0A4AB1AEYAYQByAGUAYgBuAOkAIABMAEMARAQmBDIENQRCBD0EPgQ5ACAEFgQaAC0ENAQ4BEEEPwQ7BDUEOQBMAEMARAAgAGMAbwB1AGwAZQB1AHIAVwBhAHIAbgBhACAATABDAEQATABDAEQAIABlAG4AIABjAG8AbABvAHIATABDAEQAIA4qDjUARgBhAHIAYgAtAEwAQwBEAEMAbwBsAG8AcgAgAEwAQwBEAEwAQwBEACAAQwBvAGwAbwByAGkAZABvAEsAbwBsAG8AcgAgAEwAQwBEA4gDswPHA8EDyQO8A7cAIAO/A7gDzAO9A7cAIABMAEMARABGAOQAcgBnAC0ATABDAEQAUgBlAG4AawBsAGkAIABMAEMARDCrMOkw/AAgAEwAQwBEAEwAQwBEACAAYQAgAEMAbwByAGUAcwAAdGV4dAAAAABDb3B5cmlnaHQgQXBwbGUgSW5jLiwgMjAxNgAAWFlaIAAAAAAAAPNSAAEAAAABFs9YWVogAAAAAAAAZegAADwQAAAJ0FhZWiAAAAAAAABqkwAAqsUAABeKWFlaIAAAAAAAACZbAAAZLAAAsdJjdXJ2AAAAAAAABAAAAAAFAAoADwAUABkAHgAjACgALQAyADYAOwBAAEUASgBPAFQAWQBeAGMAaABtAHIAdwB8AIEAhgCLAJAAlQCaAJ8AowCoAK0AsgC3ALwAwQDGAMsA0ADVANsA4ADlAOsA8AD2APsBAQEHAQ0BEwEZAR8BJQErATIBOAE+AUUBTAFSAVkBYAFnAW4BdQF8AYMBiwGSAZoBoQGpAbEBuQHBAckB0QHZAeEB6QHyAfoCAwIMAhQCHQImAi8COAJBAksCVAJdAmcCcQJ6AoQCjgKYAqICrAK2AsECywLVAuAC6wL1AwADCwMWAyEDLQM4A0MDTwNaA2YDcgN+A4oDlgOiA64DugPHA9MD4APsA/kEBgQTBCAELQQ7BEgEVQRjBHEEfgSMBJoEqAS2BMQE0wThBPAE/gUNBRwFKwU6BUkFWAVnBXcFhgWWBaYFtQXFBdUF5QX2BgYGFgYnBjcGSAZZBmoGewaMBp0GrwbABtEG4wb1BwcHGQcrBz0HTwdhB3QHhgeZB6wHvwfSB+UH+AgLCB8IMghGCFoIbgiCCJYIqgi+CNII5wj7CRAJJQk6CU8JZAl5CY8JpAm6Cc8J5Qn7ChEKJwo9ClQKagqBCpgKrgrFCtwK8wsLCyILOQtRC2kLgAuYC7ALyAvhC/kM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)';
    this.rotateBar.style.backgroundSize = '20px 20px';
    this.mask.appendChild(this.rotateBar);

}

// 这里用 div 来添加 bar 和边框
Painter.prototype.showHandleBar = function (ele) {

    this.mask.style.zIndex = '1000';

    var clientRect = ele.getBoundingClientRect();

    // 顺时针旋转
    this.handle1.style.left = clientRect.left - 10 + 'px';
    this.handle1.style.top = clientRect.top - 10 + 'px';

    this.handle2.style.left = clientRect.left + clientRect.width + 'px';
    this.handle2.style.top = clientRect.top - 10 + 'px';

    this.handle3.style.left = clientRect.left + clientRect.width + 'px';
    this.handle3.style.top = clientRect.top + clientRect.height + 'px';

    this.handle4.style.left = clientRect.left - 10 + 'px';
    this.handle4.style.top = clientRect.top + clientRect.height + 'px';

    // 首先计算宽高,然后定位左上角
    this.barLine.style.width = clientRect.width + 10 + 'px';
    this.barLine.style.height = clientRect.height + 10 + 'px';
    this.barLine.style.left = clientRect.left - 5 + 'px';
    this.barLine.style.top = clientRect.top - 5 + 'px';
    this.barLine.style.border = '1px solid red';

    // 将旋转的 bar 放在矩形的中心位置
    this.rotateBar.style.left = clientRect.left - 10 + clientRect.width / 2 + 'px';
    this.rotateBar.style.top = clientRect.top - 10 + clientRect.height / 2 + 'px';

}

Painter.prototype.hideHandleBar = function () {
    this.mask.style.zIndex = '-1';
}