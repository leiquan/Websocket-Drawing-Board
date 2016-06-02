# Websocket-Drawing-Board
实现一个基于 websocket 和 SVG/Canvas 的多人在线同步画图板:
* 多人可以同时操作画布,实时同步
* 冲突处理,延时和断线处理
* 只同步修改的部分,提高性能
* 多种画笔和图形

## 架构:
* 客户端的每一次增删改,均同步到服务端

* 服务端广播更新,客户端依据数据重新绘制

## 启动:
npm install && npm start
