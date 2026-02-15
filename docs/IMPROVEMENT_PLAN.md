# 🚀 WM Office - Comprehensive Improvement Plan

## 1. ✨ User Experience (UX) & Interface
*Focus: Making the app intuitive, beautiful, and easy to use.*

### 🎨 Visual Polish
*   **Dark Mode Refinement:** Ensure all charts and maps (Mapbox) look perfect in dark mode.
*   **Consistent Empty States:** Add friendly illustrations/text when lists are empty (e.g., "No cost reports yet. Create one to get started!").
*   **Micro-Interactions:** Add subtle animations when completing tasks (e.g., confetti on project completion, smooth transitions between tabs).

### 🚦 Onboarding & Help
*   **Interactive Walkthroughs:** Expand the `walkthrough` module to cover the **Cable Sizing** and **Cost Reporting** flows.
*   **Contextual Tooltips:** Add "Info" icons next to complex engineering terms (e.g., "Derating Factor") with short explanations.
*   **Video Guides:** Embed short loom-style videos in the `Help` section for complex features.

## 2. 📱 Mobile & Field Operations
*   **Focus: Empowering engineers on-site (offline/mobile).**

### 🔌 Offline Capabilities
*   **Offline Mode:** Enhance the PWA service worker to cache **active projects** and **reference tables** (cables/assemblies) for full offline access.
*   **Sync Queue:** clearly show a "Syncing..." indicator when connectivity returns, so users know their data is safe.

### 📸 Native Features
*   **Camera Integration:** Improve the "Site Diary" photo upload flow to allow **annotating photos** directly on the device before uploading.
*   **Haptic Feedback:** Add subtle vibration feedback for successful actions (saving, approving) using the Capacitor Haptics plugin.
*   **Biometric Login:** Enable FaceID/TouchID for quick access on mobile.

## 3. 🧠 Intelligence & Automation
*   **Focus: Reducing manual work with smart features.**

### 🤖 AI Assistants
*   **Smart Cable Suggestions:** enhancing `CableSizingOptimizer` to learn from past projects ("You usually use 16mm² for this load/length").
*   **Report Summaries:** Use AI to auto-generate an "Executive Summary" for Cost Reports based on the line items and variances.
*   **Chatbot Context:** Connect the `EngineeringChatbot` to the **Project Memory** so it knows which project you're talking about ("What's the total budget for Project X?").

## 4. ⚡ Speed & Reliability
*   **Focus: Making the app snappy and robust.**

### 🏎️ Performance
*   **Lazy Loading:** Ensure all major routes (Finance, HR, Engineering) are lazy-loaded to keep the initial load time fast.
*   **Virtual Lists:** Implement virtualization for long lists (e.g., global contact lists, extensive BOQs) to prevent lag.

### 🛡️ Reliability
*   **Error Boundaries:** Wrap major sections (like the PDF Editor) in Error Boundaries so one crash doesn't break the whole app.
*   **Auto-Save:** Implement "Draft" saving for long forms (Cost Reports, Site Diaries) so data is never lost if the browser crashes.

## 5. 🛠️ Engineering Core (The "Engine Room")
*   **Focus: Accuracy and compliance.**

### 📏 Calculation Engine
*   **Validation:** Strict validation of cable data against SANS 10142-1 (as planned in `TASKS.md`).
*   **Unit Tests:** Comprehensive test suite for all engineering math (`decimal.js` adoption).

### 📄 Documentation
*   **PDF Generation:** Move heavy PDF generation to a server-side function (Supabase Edge Function) for better performance on mobile devices.
