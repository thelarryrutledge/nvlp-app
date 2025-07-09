# NVLP Development Guidelines

## Task-Based Development Process

### Single Task Focus
- **CRITICAL**: Implement only ONE subtask from the active roadmap at a time
- **NEVER** complete multiple subtasks in a single session
- Exception: Only combine subtasks if they are technically interdependent and cannot function separately
- This ensures proper testing, validation, and course correction at each step
- Focus on individual subtasks, not entire tasks, sections, or phases
- Each subtask should be a single checkbox item from the active roadmap file

### Implementation Workflow for Each Subtask

1. **Mark Task as In Progress**
   - Use TodoWrite tool to update the subtask status to "in_progress"
   - Only one task should be "in_progress" at a time

2. **Implement the Functionality**
   - Write the minimum viable code to complete the subtask
   - For database tasks: Create tables, functions, or policies as specified
   - For API tasks: Create endpoints with proper validation and error handling
   - For CLI tasks: Create commands with user-friendly interfaces

3. **Test the Implementation**
   - For database tasks: Test table creation, constraints, and relationships
   - For API tasks: Test endpoints with various inputs (valid/invalid/edge cases)
   - For CLI tasks: Test commands with different parameters and scenarios
   - Use Supabase dashboard, API testing tools, or manual verification as appropriate
   - Document any test results or validation steps taken

4. **Complete Task Checklist** (in this exact order):
   - **CRITICAL**: Update active roadmap file to mark the specific subtask as completed (change [ ] to [x])
   - Update memory.md with any important implementation details or decisions
   - Fix any linting, type checking, or code quality issues
   - **CRITICAL**: Commit changes using Bash tool with git commands:
     ```
     git add .
     git commit -m "descriptive message about completed subtask"
     ```
   - Update these guidelines if you learned something important
   - Add inline documentation or README updates if needed for the implemented feature

5. **Signal Task Completion**
   - Explicitly state "Subtask [X] completed and committed"
   - Briefly summarize what was implemented and any important notes
   - Wait for user confirmation before proceeding to next subtask

## Memory Management

### Purpose of memory.md
- Document essential context, architectural decisions, and critical implementation details
- Record information that impacts future development work
- Note important lessons learned, gotchas, or configuration details
- Track current project state between development sessions

### What to Include
- Database schema decisions and relationships
- API endpoint patterns and conventions
- Supabase configuration details (project URL, important settings)
- Authentication and security implementation notes
- Key business logic rules and their implementation
- CLI command structure and patterns
- Important file locations and project structure

### What NOT to Include
- Task completion status (tracked in active roadmap)
- Routine implementation details
- Temporary notes or debugging information

### Update Frequency
- Update after completing each subtask if there are important details to remember
- Always update when making architectural decisions
- Update when discovering important project configuration or setup details

## File Modification Permissions

### Files That Don't Require User Confirmation
- `memory.md` - Always safe to update with project context and implementation details
- `roadmap` - Always safe to update to mark subtasks as completed
- `guidelines.md` - Always safe to update to improve development process
- Command line operations (git, bash, etc.) - No confirmation needed

### Files That Require User Confirmation
- All other files (migrations, source code, configuration files, etc.)
- Any new file creation except memory.md, active roadmap, guidelines.md updates

## Guidelines Evolution

### When to Update These Guidelines
- When discovering better development patterns for this project
- When encountering recurring issues that need process improvements
- When learning important Supabase-specific development practices
- When CLI development patterns emerge that should be standardized

### What to Document
- Improved testing approaches for different types of tasks
- Better commit message patterns for this project
- Supabase-specific development workflows
- Common debugging or troubleshooting steps
