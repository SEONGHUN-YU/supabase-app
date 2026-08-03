---
description: shrimp-task-manager에서 완료된 작업을 조회해 docs/ROADMAP.md의 해당 Task 항목에 ✅ 표시를 동기화합니다.
---

# docs:update-roadmap

shrimp-task-manager의 작업 완료 상태를 `docs/ROADMAP.md`에 반영하는 커맨드다. `docs/ROADMAP.md`의 개발 워크플로우 4단계("로드맵에서 완료된 작업을 ✅로 표시")를 수행한다.

## 동작 순서

1. `mcp__shrimp-task-manager__list_tasks`를 `status: "completed"`로 호출해 완료된 작업 목록(이름, ID)을 가져온다. 도구를 사용할 수 없거나 완료된 작업이 하나도 없으면 그 사실만 보고하고 종료한다.
2. `docs/ROADMAP.md`를 읽는다.
3. 완료된 각 작업에 대해 ROADMAP.md에서 `- **Task <번호>: <제목>**` 형식의 해당 줄을 찾는다.
   - shrimp-task-manager 작업 이름은 "Task 001: 프로젝트 구조 및 라우팅 설정"처럼 "Task <번호>: <제목>" 형식이다. "Task <번호>" 부분(예: `Task 001`, `Task 005-1`)을 키로 ROADMAP.md의 볼드 항목과 매칭한다.
4. 매칭된 줄이 아직 ✅로 표시되어 있지 않으면 볼드 텍스트(`**...**`) 바로 뒤에 ` ✅`를 추가한다. 이미 ✅가 있으면 그대로 둔다(재실행해도 중복 표시되지 않도록).
   - 예: `- **Task 001: 프로젝트 구조 및 라우팅 설정** - 우선순위` → `- **Task 001: 프로젝트 구조 및 라우팅 설정** ✅ - 우선순위`
   - 예: `- **Task 002: 타입 정의 및 데이터 계약 설계**` → `- **Task 002: 타입 정의 및 데이터 계약 설계** ✅`
5. ROADMAP.md의 다른 내용(설명, 하위 bullet, Phase 구조, 문구)은 변경하지 않는다 — 완료 표시 추가만 수행한다.
6. shrimp-task-manager에는 완료로 등록되어 있지만 ROADMAP.md에서 매칭되는 줄을 찾지 못한 작업이 있으면 해당 줄은 수정하지 않고 사용자에게 보고한다(제목/번호 불일치 가능성).
7. 변경이 끝나면 다음을 요약해서 보고한다: 새로 ✅ 표시된 Task 목록, 이미 ✅였던 Task 개수, 매칭 실패한 항목(있다면).

## 주의사항

- `docs/ROADMAP.md` 외의 파일은 수정하지 않는다.
- 완료되지 않은(pending/in_progress) 작업의 줄은 건드리지 않으며, 이미 있는 ✅ 표시를 제거하거나 되돌리지 않는다.
- shrimp-task-manager의 작업 상태가 이 커맨드 실행 시점의 진실(source of truth)이다 — ROADMAP.md 쪽 내용을 기준으로 역으로 작업 상태를 바꾸지 않는다.
