# G318 上海东段：经典走廊重建版 v1

生成日期：2026-10-20。用途：RideCave 虚拟骑行主路书，不作为实地交通通行指引。

## 交付与边界

上海人民广场公路零公里标志（WGS84 121.4698104, 31.2315498）→青浦→黎里→平望→震泽→南浔→旧馆→湖州→长兴雉城→林城→泗安→广德→誓节→十字→洪林→宣城→南陵弋江、三里→青阳→池州→殷汇→大渡口→安庆东门汽渡→月山→用户原路书起点（116.90983,30.61781）。

新增段 537.062759 km；合并后 5230.396550 km。共 123880 个点，原路书后缀 103565 个点的经纬度与海拔逐点保持一致。保留原始 GPX 备份；原文件的非标准 Speed 字段未并入新版 GPX 1.1，备份含原始全部内容。

这是按历史走廊约束、2014 年 G318 地图几何和当前可连接道路生成的重建，不是某一年真实骑行记录或逐米历史道路复刻。城市道路、交叉口、桥梁接线采用现有 OSM 几何；没有足够资料的细节不能承诺完全复原。安庆段包含约 1.191 km 汽渡航线，不以高速桥替代。零公里标志至道路连接约 21.5 m，原路书接缝至道路节点约 8.7 m，均为短连接。

## 开放数据与许可

道路：© OpenStreetMap contributors，ODbL 1.0；新生成东段及其衍生道路数据按 ODbL 提供。用户原路书权属不作变更。
- https://www.openstreetmap.org/copyright
- https://opendatacommons.org/licenses/odbl/1-0/
- 上海、江苏、浙江、安徽当前区域 PBF：https://download.geofabrik.de/asia/china.html
- 历史 2014-01-01 PBF：https://download.geofabrik.de/asia/china-140101.osm.pbf
- 上海零公里标志：OSM node 10033883446（公开地图定位，不代表测量精度）。

高程：Mapzen / Tilezen Terrain Tiles 的 AWS Skadi HGT，约 1 角秒网格。按 WGS84 经纬度双线性采样；无缺失瓦片或空值，未以零值填补。高程为地形估计，不等于桥面、隧道或道路实测高程。密集采样可能影响爬升估算。接缝处保留用户原始 36 m 海拔。
- https://registry.opendata.aws/terrain-tiles/
- https://github.com/tilezen/joerd/blob/master/docs/data-sources.md
- https://github.com/tilezen/joerd/blob/master/docs/attribution.md
- https://github.com/tilezen/joerd/blob/master/docs/formats.md#skadi

保留上述来源和数据贡献者署名。合成地形主要使用 USGS/NOAA 公共数据；并非声称全部高程是单一原始 SRTM 产品。详细瓦片地址与 SHA256 见 elevation-manifest.json。

## 走向核对资料

- 上海起点及沪青平走向：https://www.thepaper.cn/newsDetail_forward_9902324
- 吴江 G318 改建环评（黎里、平望、震泽）：https://www.wujiang.gov.cn/zgwj/hjbhzhyw/202205/f929b0bbd3e84adf949f224cd0fcb434/files/24a9447c0d634076a6719dab7625a0f0.pdf
- 南浔改线的交通部门报道（老线与南移新线区分）：https://zjnews.zjol.com.cn/zjnews/huzhounews/201610/t20161024_2019025.shtml
- 长兴县志公路篇（三界线旧 G318）：https://dfz.zj.gov.cn/zlyz/ossfs/h5/ZS-Z-330522-2012-001-0201/files/basic-html/page394.html
- 广德、宣城旧路 X018 资料：https://file.xuancheng.gov.cn/5/202205/202205057dd2788be1c8476197aa657075ec2c84.pdf
- 安庆轮渡历史交通报道：https://aqdzb.aqnews.com.cn/epaper/xml/aqwb/20240223/WB2024022305.pdf

部分历史网站访问不稳定；关键几何另以已下载的 2014 OSM 数据核对，保留对应道路 ID 与标签，不依赖在线网页继续可用。

## 生成与验证

osmium 提取非高速公路及渡运；NetworkX 在历史控制走廊内求路，以与 2014 G318 几何相符的现有路段优先；去除镇中心引入的重复节点往返。保留道路拐点，对稀疏边线插值至最大间距 30 m，再采样地形。插值仅增加采样点，不增加原地图精度。

- 新增道路图路径 4757 个节点，无重复节点；没有 motorway/motorway_link。
- 新段 20316 点，最大相邻间距 < 30 m；完整 GPX 一个连续轨迹段。
- 原路书后缀全部坐标和海拔严格一致，文件 SHA256 见 validation.json。
- 真实 FIT 导入前后落点经纬度保持一致；主路线里程仅增加新增段长度。
- 从上海、接缝前后、真实 FIT 终点分别导出并重新解析计距，79 km 均小于 80 km。
- 浏览器辅助里程使用新版键，旧版距月山起点的数字不再直接复用。

新版“路线位置占比”并非累计已骑比例；补入的上海东段不会算成用户已骑。

地形署名：SRTM/GMTED2010 courtesy of USGS；ETOPO1 courtesy of NOAA NCEI。
软件MIT许可不适用于GPX与数据，详见根目录DATA_LICENSES.md。
