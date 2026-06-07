# Offer 捕手

基于大语言模型的 AI 智能求职匹配 Demo —— 腾讯 AI-HR 训练营作品

## 在线体验

👉 https://fredkingdom.github.io/offer-catcher/

## 功能介绍

- **模式一 - 简历诊断**：上传简历，AI 分析匹配度并推荐适合岗位
- **模式二 - 岗位对比**：上传简历与目标岗位描述，AI 对比能力差距
- **模式三 - 综合匹配**：同时分析简历与岗位描述，生成多维度评估报告

## 技术栈

- **前端**：HTML5 + CSS3 + JavaScript（纯前端，无需构建）
- **AI 引擎**：DeepSeek 大语言模型
- **可视化**：Canvas 手绘风格雷达图
- **文档解析**：PDF.js + JSZip + docx-preview

## 项目结构

```
offer-catcher/
├── index.html       # 主页面
├── app.js           # 核心逻辑（AI 调用、文件解析、状态管理）
├── style.css        # 样式
└── sample-data.js   # 示例数据（简历模板与岗位描述）
```

## 使用说明

1. 选择一种匹配模式（一 / 二 / 三）
2. 上传或粘贴简历及岗位信息（支持 PDF、DOCX、TXT 格式）
3. 点击「开始分析」，等待 AI 生成报告
4. 查看匹配度评分、能力雷达图及详细改进建议


## 部署方式

本项目为纯静态页面，可直接部署至任意静态托管服务：

- GitHub Pages（当前使用）
- Vercel / Netlify / Cloudflare Pages
- 任何支持静态文件的 Web 服务器

## 许可

MIT 许可证
