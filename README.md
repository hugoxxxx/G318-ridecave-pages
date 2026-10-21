# G318 · 接着骑

导入虚拟骑行FIT/GPX，沿内置路书生成默认79km且严格小于80km的下一段GPX，供RideCave使用。

## 本地运行

安装Node.js LTS 24，Windows双击start-local.cmd。其他系统运行npm ci和npm run dev，打开终端显示的127.0.0.1地址。不要直接双击index.html；Web Worker需要HTTP(S)。关闭终端停止本地服务。生产构建npm run build，预览npm run preview。

## GitHub在线版

https://hugoxxxx.github.io/G318-ridecave-pages/ （以部署状态为准）。GitHub Actions会运行测试、构建并发布；Settings → Pages的Source设为GitHub Actions。全程GPX随网站部署，无需重复上传。

## 天地图

在https://lbs.tianditu.gov.cn/创建浏览器端应用。白名单填hugoxxxx.github.io,127.0.0.1（英文逗号，不写协议、路径；当前表单不接受localhost，本地使用127.0.0.1）。

本地：复制.env.example为.env.local，填写VITE_TIANDITU_KEY，重启服务。GitHub：Settings → Secrets and variables → Actions → Variables添加TIANDITU_KEY，重新运行Publish GitHub Pages。浏览器端Key会进入浏览器请求，应限制域名；不使用服务端密钥。

采用vec_w底图+cva_w中文注记；无Key暂用OSM。天地图地理坐标与WGS84近似叠加用于虚拟骑行预览，不用于测绘。原始匹配和导出坐标不变。

## 使用和局限

导入记录、核对地图起点、下载下一段。支持上海起点、手动起点、手机布局和本地进度清除。“路线已完成xx%”按续骑起点占主路书总长度计算，不是实际累计骑行距离之和。

路书约5231.613km；上海东段537.063km为经典G318走廊重建，含安庆汽渡，非逐米历史实录。用户原路书坐标和海拔保留。详见public/routes/PROVENANCE.md。

骑行文件只在浏览器内处理，不上传、不接入分析追踪。底图供应商会收到底图瓦片请求；底图失败不影响GPX计算。偏离、反向、静止或重复路段歧义时需要核对。海拔爬升为估算。

## 测试

npm test；npm run build。可用RIDE_FIXTURE_PATH选择本地记录；未设置时相关测试明确跳过。私人文件不提交。

## 开源许可

原创代码MIT（LICENSE）；依赖完整声明见THIRD_PARTY_NOTICES.md及public/licenses.txt。GPX、OSM和地形独立适用DATA_LICENSES.md，不套用软件许可。

西段已按2026-10-21用户更新路书重新合并，显示保留全部源坐标并随缩放进行屏幕像素简化。若源GPX稀疏，仍按真实采样点连线，不凭空贴合底图。
