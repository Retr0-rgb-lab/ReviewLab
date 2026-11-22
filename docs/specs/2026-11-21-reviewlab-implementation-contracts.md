# ReviewLab 实现契约（2026-11-21）

这份文档给实现阶段的各个 Agent 用。**它只定义接口，不定义产品行为**——产品行为以 `2026-11-21-reviewlab-file-overview-spec.md` 为准，以 `2026-11-12-reviewlab-requirements.md` 为基准。

任何 Agent 只改自己那份文件，不要改别人的文件。需要别人的接口变了，先说，不要自己动手改。

## 0. 全局约定

- **界面上的文字一律英文**（按钮、标题、空状态、错误说明）。代码里的注释一律英文。
- **不 commit、不 push。** 用户没有要求。
- 新增依赖只有 `motion`（已装好，`package.json` 里是 `"motion": "^14.14.0"`）。**不要动 `package.json` 和 `package-lock.json`。**
- 样式：每个组件/视图一个自己的 `.css` 文件，用 CSS 变量做主题，跟 `source/client/src/views.css` 里已有的变量体系一致。不要往 `views.css` 里堆新规则。
- 主题：`White` / `Dark` 两个值，`theme` prop 传进来。深色主题的变量已经有 `--rl-surface` / `--rl-surface-raised` / `--rl-ink` / `--rl-ink-muted` / `--rl-line` / `--rl-accent` / `--rl-danger`。
- 不引入新的图标库。现有的是 `@hugeicons/react` + `@hugeicons/core-free-icons`。

## 1. 数据层契约

### 1.1 数据库

`cards` 表加一列：

```sql
alter table cards add column favorite boolean not null default false;
```

`cards` 的列现在是：`id, title, body, folder_id, mastery, created_at, updated_at, ord`。
`mastery` 的三个值：`unmarked` / `mastered` / `unmastered`。

`source/database/api.sql` 里所有会返回卡片的函数，都要在返回的 jsonb 里加上 `'favorite', <值>`：
`api_list_level`、`api_get_card`、`api_list_tree`、`api_create_card`、`api_rename_card`、`api_update_card_body`、`api_set_mastery`。

新增一个函数：

```sql
create or replace function api_set_favorite(p_id uuid, p_favorite boolean)
returns jsonb
```

行为跟 `api_set_mastery` 一样（校验、权限、错误码风格照抄 `api_set_mastery`），只是改的是 `favorite` 而不是 `mastery`，并且要更新 `updated_at`。返回改完的那张卡。

`source/server/policies.sql` 里要给 `api_set_favorite` 加 `grant execute`，跟其它函数一样的写法。

### 1.2 客户端

`source/client/src/api.js` 里加一个包装函数，形状跟现有的 `apiSetMastery` 一样：

```js
export async function apiSetFavorite(cardId, favorite) { ... }
```

`source/client/src/views/fileActions.js` 里加：

```js
export async function setFavorite(cardId, favorite) { ... }
```

形状跟现有的 `setMastery` 一样：成功返回结果对象，失败返回 `{ error }`。它要调的底层调用是 `set_card_favorite`。

`source/client/src/views/levelActions.js` 里的 `fetchLevel` 和 `fetchTree` 返回的卡片对象，**现在会多一个 `favorite` 布尔字段**。其它字段不变。

### 1.3 客户端用到的卡片形状

```js
// 列表里（api_list_level）：没有 body
{ id, ord, title, mastery, favorite, folder_id, created_at, updated_at }
// 树里（api_list_tree）和单卡（api_get_card）：有 body
{ id, ord, title, body, mastery, favorite, folder_id, created_at, updated_at }
```

## 2. 共享组件契约

新建的组件全部放在 `source/client/src/components/`。

### 2.1 `react-bits/FlipCard.jsx`（抄件）

从 React Bits 抄：`https://github.com/DavidHDev/react-bits/tree/main/src/content/Micro/FlipCard`。文件头要写上作者 David Haz 和 MIT + Commons Clause 许可（跟 `source/client/src/components/react-bits/` 里现有的抄件一个写法）。

**不要改它的逻辑。** 抄过来之后，调用方只用这几个 prop：

| prop | 说明 |
|---|---|
| `front` | 正面内容（React 节点） |
| `back` | 反面内容（React 节点） |
| `flipped` | 受控：true = 显示反面 |
| `onFlipChange(flipped)` | 翻面状态变化时回调 |
| `width` / `height` | 尺寸（像素） |
| `radius` | 圆角 |
| `background` / `color` | 前景背景色 / 文字色 |
| `shadow` / `shadowOpacity` | 阴影 |
| `ariaLabel` | 无障碍标签 |
| `className` | 附加 class |
| `disabled` | 禁用 |
| `flipOnClick` | 默认 true，点击就翻面 |
| `draggable` | 默认 true，横向拖动甩一下就翻面 |

它内部依赖 `motion/react`，`motion` 已经装好。

### 2.2 `react-bits/CometDial.jsx`（抄件 + 一处小改）

从 React Bits 抄：`https://github.com/DavidHDev/react-bits/tree/main/src/content/Micro/CometDial`。同样要写许可头。

**必须知道它的几何**（照抄过来就对了，不用自己推导）：

```js
const gap = 360 - sweep;
const start = 90 + gap / 2;      // sweep=270 → start=135
const end = start + sweep;
const ang = start + f * sweep;   // f = 归一化后的值
```

所以 **`sweep={270}` 时，起点正好是 135°（左下 7:30），终点是 45°（右下 4:30），底部 90° 开口**——这就是规格里要的几何，不用改。

它需要的 prop：

| prop | 说明 |
|---|---|
| `value` | 受控的当前值（0–100 的整数）。给了它就由外部驱动 |
| `min` / `max` | 默认 0 / 100 |
| `step` | 默认 1 |
| `unit` | 默认 `'%'`。中心显示 `数字 + unit` |
| `label` | 无障碍标签，默认 `'Level'` |
| `accent` | **彗尾那段弧的颜色**（CSS 变量 `--cd-accent`） |
| `ink` | **轨道（没点亮的那段）的颜色**（CSS 变量 `--cd-ink`） |
| `size` | 默认 250 |
| `sweep` | 默认 320。**我们要传 270** |
| `thickness` | 默认 5 |
| `cometReach` / `cometWidth` | 彗尾的长度和宽度，默认 180 / 12 |
| `speed` | 动画速度，默认 25 |
| `disabled` | 默认 false。**只挡住拖拽和键盘，不影响受控 value 的动画** |
| `onChange` / `onChangeEnd` | 拖拽时的回调。我们不拖，所以不用接 |
| `className` | 附加 class |

**必须改的三处**（原版是单色轨道 + 0.24 透明度 + disabled 整体变暗，跟规格的三态对不上）：

1. 加一个 `restColor` prop，默认 `undefined`。**给了值**时轨道用这个颜色画，并且**不透明度设为 1**（实弧）；**不给**时保持原版行为（`--cd-ink`、0.24 透明度）。这样 Master 绿弧是实色、没掌握红弧也是实色、空态时轨道退到中性灰。
2. 加一个 `readOnly` prop。`readOnly` 时**挡住拖拽和键盘**（跟 `disabled` 一样），但**不要加 `data-disabled` 属性**——原版 CSS 里 `.comet-dial[data-disabled] { opacity: 0.55 }` 会把整个圆环变暗，我们要的是"只读但看起来正常"。`aria-disabled="true"` 和 `tabIndex={-1}` 仍然要设。
3. `readOnly` 时**不要**加 `pointer-events: none` 到 svg 上。要让外层包着的 `<button>` 能收到点击（我们要"点圆环进统计页"）。

改完在文件头写一行注释说明这三处改动，其余逻辑保持原样。

### 2.3 `MasteryDial.jsx`（自己写，包住 CometDial）

```jsx
<MasteryDial
  mastered={1}          // M：本层状态为 mastered 的卡片数
  unmastered={2}        // N：本层状态为 unmastered 的卡片数
  size={132}            // 小圆环在左栏用 132，统计页大圆环用 260
  onOpen={() => navigate(`/stats/${folderId}`)}   // 可选；给了就能点
  theme="White"
  className="..."
/>
```

行为：

- `p = (mastered + unmastered) === 0 ? 0 : mastered / (mastered + unmastered)`
- 传给 CometDial 的 `value = Math.round(p * 100)`，`sweep={270}`，`unit="%"`，`min={0}`，`max={100}`，`step={1}`
- `accent` = 绿色（Master），`restColor` = 红色（没掌握）
- **空态**（`mastered + unmastered === 0`）：**不传** `restColor`，轨道就是原版的中性灰；`value={0}`，中心显示 `0%`
- 左侧一个标签 `Master`（绿），右侧一个标签 `Not Mastered`（红）
- `onOpen` 存在时，整个圆环包在一个 `<button>` 里，点了调 `onOpen`。按钮要有 `aria-label`，比如 `Open the statistics of this level`
- 传了 `onOpen` 时 CometDial 要 `readOnly`（挡住拖拽，但不变暗、且点击能冒泡到外层的 button）

### 2.4 `ArcGallery.jsx`（自己写，这是最难的一块）

```jsx
<ArcGallery
  cards={[{ id, title, body, mastery, favorite }, ...]}   // 本层的卡片，按创建时间从早到晚
  activeIndex={0}
  onActiveIndexChange={(next) => {}}
  zoom="focused"          // 'focused' | 'overview'
  onZoomChange={(z) => {}}  // 可选。普通视图不传 → 固定 focused
  onFlip={(id, flipped) => {}}  // 可选
  focusExtra={null}       // 可选。渲染在聚焦卡正面左下角的节点
  theme="White"
  className="..."
/>
```

行为：

- **focused 档**：只显示 `activeIndex` 那张卡（用 FlipCard），居中放大，周围卡片隐去但保留弧形的空间感。
- **overview 档**：所有卡片排成一段横向弧线，当前卡在弧的正中，两侧外倾、边缘淡出。
- **切换卡片**：`ArrowLeft` / `ArrowRight` 调 `onActiveIndexChange`，**在本层卡片内循环**（到最后一张回到第一张）。文件夹不参与。
- **拖拽**：横向甩动切换，松手等同下一张（跟现在 FocusView 的逻辑一致：拖过阈值才算，没甩完松手回原位）。
- **缩放**：`onZoomChange` 存在时，捏合（`wheel` + `ctrlKey`，或触屏双指）在 focused / overview 之间连续过渡。缩放值是一个 0–1 的连续量，自己实现。普通视图不传 `onZoomChange`，就锁死在 focused。
- **点击**：focused 档里点卡 → 翻面（调 FlipCard 的 `onFlipChange` 再调 `onFlip`）；overview 档里点卡 → 先 `onActiveIndexChange` 再 `onZoomChange('focused')`。
- 卡片正面显示 `title`，反面显示 `body`。`body` 为空时反面显示 `This card has no content yet.`
- 卡片上要能看出掌握状态（绿点 / 红点 / 空心灰点）和收藏状态（星标）。

**弧是正面看到的一段圆柱**：`x = R·sin θ`、`z = -R(1-cos θ)·depth`、`rotateY = -θ`，其中 `θ = 距离 × 7°`、`R = 1400`、`depth = 0.85`。中间的卡是平的，两侧的卡转开并退后。缩放是**连续量** `t ∈ [0,1]`，聚焦态和弧形态之间插值。

**`focusExtra` 插槽**：普通视图要把 `Mastered` / `NotMastered` 两个按钮放在聚焦卡的正面左下角，就传一个节点进来。禅模式不传（那里没有这两个按钮）。

**导出的纯函数**（测试直接测它们）：

```js
export function wrapIndex(index, length)                  // 循环索引
export function offsetOf(index, activeIndex, length, loop) // 离当前项几格，取最短方向
export function cardLayout(index, activeIndex, length, t, options)  // 这张卡的位置
export function zoomValue(zoom)                           // 'overview' → 0，'focused' → 1
export function zoomName(value)                           // < 0.5 → 'overview'，否则 'focused'
```

### 2.5 `CardWheel.jsx`（抄 React Bits `OptionWheel`）

从 React Bits 抄：`https://github.com/DavidHDev/react-bits/tree/main/src/content/Components/OptionWheel`。文件头要写作者 David Haz 和 MIT + Commons Clause。

**它是什么**：一个轮盘，选项坐在同一个圆上，圆心在锚点左侧 R 像素处，`R = 行高 / tan(切角)`。所以默认 `side='left'` 时看到的是**右半圆**——当前项在最右边，往上下两端走卡片逐渐向左退，最后退出屏幕左缘。**圆心整个在屏幕左侧之外。**

它的几何（照抄即可，别自己推导）：

```js
const mirror = side === 'right' ? -1 : 1;
const tiltRad = (tilt * Math.PI) / 180;
const R = rowH / tiltRad;
const ang = clamp(d * tiltRad, -Math.PI/2, Math.PI/2);   // d = 离当前项几格
y   = R * Math.sin(ang);
x   = -mirror * R * (1 - Math.cos(ang)) * curve;
rot = (mirror * ang * 180) / Math.PI;
opacity = Math.max(minOpacity, 1 - Math.abs(d) * fade);
blur    = Math.abs(d) * blur;
```

**要改的地方**：

1. `items` 传的是 React 节点，原版渲染 `{label}`——直接把文字换成我们的卡片内容就行。它本来就是 `{label}`，传节点可以。
2. `soundUrl` 不传（默认空字符串，没有声音）。原版有 `playTick()`，不传 url 就不会响。**不要引入声音。**
3. `rowH = fontSize * spacing * remPx` 这一行要改成**按卡片高度算**：我们的小卡约 56px 高，间距 16px，所以 `rowH ≈ 72px`。原版用 `fontSize` 兼做字号，改了之后字号会变，我们用卡片自己的 CSS 定尺寸，不受影响。
4. `inset`（锚点离容器左边的距离）要调到**让锚点落在左栏的右缘**——大约 200px。这样卡片往左退，退出屏幕左缘。
5. CSS 里 `.option-wheel__item` 的 `font-size`、`white-space: nowrap`、`font-weight` 对卡片没有意义，但 `position: absolute; top: 50%; left: var(--ow-inset); transform-origin: left center` **必须保留**（定位和旋转靠它们）。

**它的 prop**：

| prop | 说明 |
|---|---|
| `items` | React 节点数组，每个是一张小卡片 |
| `defaultSelected` | 当前项的下标 |
| `onChange(index, item)` | 当前项变了时回调 |
| `side` | `'left'`（默认，**我们要的**）或 `'right'` |
| `tilt` | 每离开一格转多少度，默认 6 |
| `curve` | 弧的弯曲程度，默认 1 |
| `blur` | 离得越远越模糊，默认 2 |
| `fade` | 离得越远越淡，默认 0.25 |
| `minOpacity` | 最远的还能看见多少，默认 0.05 |
| `spacing` / `fontSize` | 决定行高，见上面第 3 条 |
| `inset` | 锚点离容器左边多远，见上面第 4 条 |
| `loop` | 默认 false。我们要循环，所以传 true |
| `draggable` | 默认 true，拖动转轮盘 |
| `textColor` / `activeColor` | 文字颜色，对卡片来说改成卡片自己的颜色 |

它自带**滚轮和触控板**转轮盘（手动注册的非被动监听器），也自带 `ArrowUp/ArrowDown/ArrowLeft/ArrowRight` 切项。这些都留着。

**我们额外要的**：

```jsx
<CardWheel
  cards={[{ id, title, mastery, favorite }, ...]}   // 本层的卡片
  activeIndex={0}
  onSelect={(index) => {}}
  theme="White"
/>
```

- `activeIndex` 是**受控**的：外面说聚焦哪张，轮盘就转到哪张。
- 每张小卡片：左边细线卡片图标，中间单行省略的标题，右边一个状态点（绿 / 红 / 空心灰），当前项加一圈 2px 蓝色描边。
- 卡片内容是节点，所以可以直接传 `<div className="card-wheel__card">…</div>`。

### 2.6 `Dock.jsx`（自己写）

```jsx
<Dock
  visible={true}            // 父组件根据滚动控制；false 时向下滑出
  favoriteActive={false}    // 当前卡是否已收藏
  onFavorite={() => {}}
  onCreate={() => {}}
  onEdit={() => {}}
  onDelete={() => {}}
  theme="White"
/>
```

四个按钮，顺序固定：**收藏 / 创建 / 编辑 / 删除**。图标用 `@hugeicons/react` 的细线图标。每个图标下面一个小号灰色文字标签：`Favorite` / `Create` / `Edit` / `Delete`。悬停时图标放大一点点并浮起。

### 2.7 `EditPanel.jsx`（自己写）

```jsx
<EditPanel
  open={true}
  card={{ id, title, body }}   // null 表示没有正在编辑的卡
  onClose={() => {}}
  onSave={(id, { title, body }) => {}}   // 成功返回 { }，失败返回 { error }
  theme="White"
/>
```

从**右侧**滑出的编辑窗，里面两个输入框：标题、正文。保存时校验：标题去空白后不能为空、≤120 字符；正文允许为空、≤4000 字符。不合法就在窗内显示原因，不调用 `onSave`。`Esc` 关闭。

### 2.8 `FavoritesRail.jsx`（自己写）

```jsx
<FavoritesRail
  favoriteCount={2}
  filterActive={false}
  onToggleFilter={() => {}}
  onOpenZen={() => {}}
  theme="White"
/>
```

右栏从上到下两个位置：**收藏位**（星形图标 + 数量，`filterActive` 时星填实）+ **禅模式入口**。

> ⚠️ 收藏位的**过滤行为是待设计项**（规格 P4）。这一轮只实现外观和开关状态，**过滤语义先不做**：点了只切换 `filterActive` 的视觉状态，**不真的过滤卡片列表**。`onToggleFilter` 照样会被调用，由上层暂时忽略。

## 3. 视图契约

三个视图都从 `App.jsx` 收到同一组 props（跟现在的 `shared` 一样）：

```js
{ theme, dataVersion, onOpenSearch, onRequestDelete, onError, onClearError, onDataChanged, onLevelReady }
```

### 3.1 `FileView.jsx`（改写）

路由 `/folder/:folderId/:itemId`。props 增加 `itemId`。

- 顶栏：搜索按钮、标题、面包屑、计数、主题开关。
- 左栏：文件夹行 + `CardWheel` + `MasteryDial`。
- 中区：`ArcGallery`（`zoom="focused"`，不传 `onZoomChange`）。
- 右栏：`FavoritesRail`。
- 底部：`Dock`。
- 大卡上的掌握按钮 `Mastered` / `Not Mastered`，点了立刻动左下的圆环。
- 编辑走 `EditPanel`，删除走现有的确认弹窗（`onRequestDelete`）。

### 3.2 `ZenView.jsx`（新）

路由 `/zen/:folderId` 和 `/zen/:folderId/:itemId`（两条都要）。

- 全屏，没有顶栏、左栏、右栏、Dock。只有 `ArcGallery` 和右上角三个小按钮：**放大镜（打开搜索层）、主题开关、叉号（退出）**。
- `Esc` 退出。叉号点了退出。退出 = 回到 `/folder/:folderId/:itemId`（当前聚焦的那张；没有卡片时回 `/folder/:folderId`）。
- 聚焦哪一张：地址带 `:itemId` 就用它；不带就取本层最早创建的那张。从普通视图进来说，用普通视图当前那张。
- 禅模式里只有卡片，没有文件夹。
- 禅模式里**不做**掌握和收藏（没有 Dock、没有按钮）。
- 禅模式里**切卡不改地址**。

### 3.3 `StatsView.jsx`（改写）

路由 `/stats/:folderId`。

- 一个放大的 `MasteryDial`（`size={260}`）。
- 完成率：已标记张数 / 本层卡片张数，写出分子和分母。本层没有卡片时显示 `This level has no cards.`，不显示 0%，不除零。
- 未掌握的卡的清单，按创建时间从早到晚。点一条打开 `/zen/:folderId/:itemId`，落在那一张上。

## 4. 路由表

| 路径 | 视图 | 说明 |
|---|---|---|
| `/` | 重定向 | 跳到根文件夹的文件视图 |
| `/folder/:folderId` | FileView | 这一层没有卡片时停在这里；有卡片时重定向到最早创建的那张，地址变成 `/folder/:folderId/:itemId` |
| `/folder/:folderId/:itemId` | FileView | 聚焦 `itemId` 那张卡。`itemId` 不在这一层时，回落到最早创建的那张并 `replace` 地址 |
| `/zen/:folderId` | ZenView | 禅模式，不定位到某一张。刷新落在本层最早创建的那张卡 |
| `/zen/:folderId/:itemId` | ZenView | 禅模式，聚焦那一张。**搜索打开卡片、统计清单点一条，都用这个** |
| `/stats/:folderId` | StatsView | 统计 |

`itemId` 不在这一层时的回落规则：**用 `replace` 换掉地址**，不要往历史里塞一条。

## 5. 阶段与文件所有权

每个 Agent 只改自己列出的文件。别人要改你的文件，先说。

| 阶段 | Agent | 只改这些 |
|---|---|---|
| P1 | 数据层 | `source/database/schema.sql`、`source/database/api.sql`、`source/server/policies.sql`、`source/database/migrations/`、`source/client/src/api.js`、`source/client/src/views/fileActions.js`、`source/API.md` |
| P2 | 基础组件 | `source/client/src/components/react-bits/FlipCard.jsx`+`.css`、`react-bits/CometDial.jsx`+`.css`、`react-bits/OptionWheel.jsx`+`.css`、`source/client/src/components/MasteryDial.jsx`+`.css` |
| P3 | 交互组件 | `source/client/src/components/ArcGallery.jsx`+`.css`、`CardWheel.jsx`+`.css`、`Dock.jsx`+`.css`、`EditPanel.jsx`+`.css`、`FavoritesRail.jsx`+`.css` |
| P4 | 三个视图 | `source/client/src/views/FileView.jsx`+`FileView.css`、`ZenView.jsx`+`ZenView.css`、`StatsView.jsx`+`StatsView.css` |
| P5 | 路由装配 | `source/client/src/App.jsx`、`source/client/src/index.css`、`source/client/src/views.css` |
| P6 | 测试与文档 | `source/tests/cases.mjs`、`source/tests/stubs/`、`source/TEST-PLAN.md` |

`source/client/src/components/react-bits/` 目录下的抄件，**每个文件头都要有许可声明**。

## 6. 验收口径

实现阶段结束前，每个 Agent 自己要跑：

```
cd source && npm run build     # 必须没有错误
cd source && npm test          # 必须全过（现有的 36 个不能坏）
```

跑不了构建也不要硬说过了。
