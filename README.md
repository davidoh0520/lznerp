# LZN ERP V2

GitHub Pages + Supabase 기반의 부품 구매·판매·도면·주문·인보이스 통합 포털입니다.

## 화면

- `portal.html`: 메인 진입 화면
- `admin.html`: 관리자 대시보드, 거래원장, 품목, 한국 주문, 인보이스
- `order.html`: 한국 고객용 주문·도면 업로드·진행 조회
- 기존 ERP 초안 파일은 호환을 위해 저장소에 유지합니다.

## Supabase

`supabase/migrations/20260816_erp_portal.sql`은 기존 쇼핑몰·ERP 테이블을 변경하지 않고 `erp_v2_*` 표와 `erp-v2-drawings` 비공개 저장소만 생성합니다.

접근 권한:

- 내부 거래·품목: `admin_users`에 등록된 관리자만 접근
- 한국 주문: 로그인 사용자는 자기 주문만 접근
- 주문 도면: 업로더와 관리자만 서명된 임시 링크로 접근
- 인보이스: 해당 주문자와 관리자만 접근

## 기존 엑셀 데이터 이관

`scripts/build_seed.py`가 로컬의 검증된 통합 데이터에서 이관 SQL을 생성합니다. 생성되는 `supabase/seed.sql`에는 구매·판매 단가와 로컬 도면 경로가 있으므로 `.gitignore`로 제외되며 공개 저장소에 올리면 안 됩니다.

세금번호, 은행명, 계좌번호, SWIFT 등 결제 정보도 공개 코드에 저장하지 않습니다. 인보이스에는 기본적으로 보안 전달 안내가 표시되며, 실제 결제 정보는 보호된 관리 경로에서만 제공해야 합니다.

## 배포

`main` 브랜치에 반영하면 `.github/workflows/pages.yml`이 GitHub Pages로 정적 사이트를 배포합니다. Supabase Auth의 Site URL과 Redirect URL에는 실제 GitHub Pages 주소의 `admin.html`, `order.html`을 등록해야 합니다.
