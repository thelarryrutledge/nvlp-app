# CLAUDE.md - AI Assistant Context

## Project Overview
**App**: NVLP - Virtual Envelope Budgeting System  
**Type**: Personal finance management mobile app  
**Stack**: React Native (mobile) + Supabase (backend)  
**Architecture**: Monorepo with shared packages

## Key Project Files
- **Roadmap**: `/apps/mobile/docs/react-native-roadmap.md` - Primary source for next tasks
- **Context**: `/IMPLEMENTATION_PLAN.md` - Additional app context if needed
- **Mobile App**: `/apps/mobile` - React Native app directory

## Workflow for Executing Subtasks

When prompted to "execute next subtask":

1. **Identify Next Task**
   - Check `/apps/mobile/docs/react-native-roadmap.md`
   - Find the next uncompleted `[ ]` subtask
   
2. **Execute the Subtask**
   - Implement the feature completely
   - Follow existing patterns and conventions
   - Test functionality
   
3. **Update Documentation**
   - Mark subtask as complete `[x]` in roadmap
   - Only update CLAUDE.md if critical context is needed for future sessions
   
4. **Commit Changes**
   - Create a descriptive commit message
   - Include all related files
   
5. **Wait for Next Prompt**
   - Do not proceed to next subtask until prompted

## Current Status
- **Last Completed**: Phase 5.3 - Envelope Visualization
- **Next Phase**: Phase 6.1 - Payee Features
- Check roadmap for specific next subtask

## Important Technical Notes
- **Supabase**: Remote-only, no local Docker
- **Testing**: Always check for TypeScript errors with `pnpm type-check`
- **Navigation**: Uses React Navigation 6 with typed routes
- **State**: Uses React Context for global state (auth, budget selection)