# Vuex 源码分析

基于 `v3.6.2` 版本进行分析.

## 目录结构

```markdown
- src/
  - index.js // 入口文件，仅导出各种方法、属性.
  - store.js // 核心文件.
  - helpers.js // 映射辅助函数.
  - mixin.js // 将 Vuex init 钩子注入到每个实例的 init 钩子列表中.
  - util.js // 工具集.
```
