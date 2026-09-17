# อัปเดตสถานะและแผนหลัก — 2026-09-16

ส่วนนี้อ้างอิง ZIP ล่าสุด + สรุปจากแชทเดิมที่ผู้ใช้ส่งภายหลัง หากต่างจากบันทึกตรวจครั้งแรกด้านล่างให้ใช้ส่วนนี้

## ข้อเท็จจริงเพิ่มเติมจากประวัติที่ผู้ใช้ให้
- Supabase Cron มีแล้ว: core FX ทุก10นาที, relative ทุก30นาที เลื่อนเวลาไม่ให้ชน core
- Cron HTTP timeout เคยปรับ10→30วินาทีแล้ว และมี query ตรวจ net._http_response
- Core/relative/commodity ใช้ batch write และ retry DB3ครั้งโดยไม่ยิง provider ซ้ำ
- ตั้งใจซ่อน Refresh UI; auto refresh ยังทำงาน ไม่เพิ่มปุ่มกลับเอง
- forecast_runs เคยอยู่ในแผน Backtest แต่ระบุว่ายังไม่ได้ทำ; fx_score_snapshots เพิ่งเสนอในแชทนี้และยังไม่ได้รัน
- ไม่มีการตรวจ Cron/DB production สดในรอบนี้ หลักฐานส่วนนี้มาจากสรุปผู้ใช้

## สถานะปัจจุบันแทนสรุปเก่า
Iron Ore ทำแล้ว: OilPriceAPI, history/24H signal, freshness, scoring, integration. ยังไม่ใช่หลักฐานว่ามีประวัติยาวเพียงพอหรือยืนยันสิทธิ์ commercial ของบัญชี
Risk ทำแล้ว: VIXY proxy, 1H inverse score, session/freshness, weight5; validation ล่าสุดใน ZIP ครบ; ไม่ทำ holiday calendar
Macro ทำแล้ว: Policy4/Inflation3/Labour2/Growth1 รวม10; GDP EXPERIMENTAL; ไม่เท่ากับทำ PPI/expectations/surprise/Event Risk แล้ว
Model planned max100; actual active max98 เพราะ Gold20% ของ Commodity ยัง monitor-only; ไม่บังคับเติมให้100
Forecast/Action/Outcome evaluation/News/Event Risk ยังไม่มี implementation ใน ZIP

## งานจำเป็นก่อนเริ่ม Forecast
1. แก้ข้อความหน้า app/page.tsx /90→/100, active factors รวม Macro, ข้อความ Forecast เหลือรอ calibration/backtest; README เก่าต้องปรับ
2. ตรวจ stale/missing/invalid/future timestamps ก่อนให้คะแนนทุกหมวด โดยเฉพาะ Price/Mean Reversion; ทดสอบกรณีราคาค้างจริงก่อนสรุปว่าเป็น bug ทุก branch
3. แยก fail ของ Macro แต่ละ component: ปัจจุบัน Promise.all + dashboard catch ทำให้ถ้า Inflation/Labour throw อาจตัด Macroทั้ง10 แม้ Policy/Growthยังใช้ได้
4. cache หรือ scheduled snapshot สำหรับ GDP ผ่านแนวทางเดิม เพราะตอนนี้ทุก page refresh เรียก IMF no-store ได้; คง checkedAt/referencePeriod และ freshness ไม่ใช้ cache กลบข้อมูลเก่า
5. ตรวจ auth missing CRON_SECRET ให้ fail closed ทุก route

## Workflow เป้าหมายและลำดับพัฒนา
A. Supabase Cronเดิม → ingest providers → validate → batch upsert/retry → observations/history
B. snapshot job หลัง ingest → อ่านข้อมูลที่ทราบ ณ issued_at → factor scores/weights/quality → บันทึก immutable score run + model_version
C. เมื่อสร้าง Forecast engine แล้ว: ใช้ run เดียวกันผูก predicted direction/move/range1H4H และ forecast_version ก่อนรู้ผล
D. outcome job → เมื่อครบ1H4H จับคู่ราคาอ้างอิง symbol/source เดียวกัน → เก็บ actual timestamp/gap/return/errors; ไม่พบราคาให้ pending/missing ไม่ใช่0
E. evaluation → เทียบ baseline no-change และ momentum; directional accuracy, MAE, endpoint interval coverage+width แยกตาม horizon; แยกข้อมูลตามเวลา train/validation/test หรือ walk-forward
F. calibrated confidence → อิงผลจริงในชุดนอกตัวอย่าง; ก่อนหน้านั้นแสดง Data Quality/Signal Agreement เท่านั้น ไม่อ้างเป็นโอกาสทายถูก
G. minimal event calendar ก่อน Action → event time/currency/importance/source → ลดconfidenceหรือขยายrangeตามกติกาที่ทดสอบ; calendar missing เป็น unknown ไม่ใช่ไม่มีข่าว
H. Action prefund/hold/postfund → ใช้Forecast+Confidence+EventRisk+cash constraints/costs → เริ่มแนะนำและผู้ใช้ตัดสิน ไม่สั่งธุรกรรมเงินจริงอัตโนมัติ
I. UIอ่านเร็ว+drivers+charts+daily recap และ stale/job failure alerts ตามงานที่พร้อม

## การออกแบบประวัติให้ไม่สร้างซ้ำ
ยังไม่สร้างตารางในรอบนี้ ก่อน implementation ตรวจ schema Supabaseจริงครั้งเดียว โดยเฉพาะ forecast_runs ที่อยู่ในแผนเดิม
เลือก logical run หลักหนึ่งชุดเชื่อมคะแนน→forecast→outcome ไม่สร้าง fx_score_snapshots กับ forecast_runs ซ้ำเนื้อหาโดยไม่มีเหตุผล
Run ต้องเก็บ issued_at, market_timestamp, symbol/source/rate, component values/reference dates/availability/effective weights, model_version และ inputs ที่จำเป็น
Forecast ยังไม่มีให้ null/สถานะ NOT_GENERATED ไม่บันทึก0หรือสร้างผลย้อนหลังปลอม
Idempotency อิง scheduled run slot+model version; market timestamp อย่างเดียวไม่พอเมื่อ Macroเปลี่ยนแต่ราคาเดิม
เก็บผลคาดการณ์เดิมไม่แก้ทับ ส่วน outcome แยก/เพิ่มภายหลังโดยไม่แก้ prediction
Historical backtest ห้ามใช้ macro revision ใหม่แทนข้อมูลที่เคยรู้จริง; ข้อมูลมีเท่าไรให้ระบุ limitation และเริ่ม forward evaluation ได้ทันที
เกณฑ์ราคาที่ใช้/neutral zone/horizon/market closed/missing outcome ต้องประกาศก่อนวัดผล
Confidence ของ Yield ในระบบเดิมเป็นคุณภาพข้อมูล ไม่ใช่ forecast accuracy

## ลำดับทำงานที่ตกลงใช้เป็นฐาน
1. ปิดความไม่ตรงของหน้าเว็บและตรวจ quality gates สำคัญ
2. ต่อ Supabase Cronเดิมให้เก็บ score runs พร้อม model version หลังตรวจไม่ซ้ำ schema
3. Outcome1H/4H + evaluation ของ signal และ baseline
4. Forecast range1H4H + calibration และ confidence จากผลนอกตัวอย่าง
5. Minimal Event Risk (ก่อนนำไปใช้ Action); ส่วนข่าววิเคราะห์เชิงลึกทำภายหลัง
6. Action V1 โดยกำหนดข้อจำกัดยอดเงินฝั่ง AU/TH เวลาและต้นทุน settlement
7. ปรับ UIและระบบแจ้งเตือน/ดูแลต่อเนื่อง

ไม่ให้เปอร์เซ็นต์ความคืบหน้า45–55หรือ60–70เป็นค่าปัจจุบัน เพราะยังไม่มี checklistและเกณฑ์ส่งมอบที่นับได้จริง
ไม่เริ่มเชื่อม Iron Ore/Risk/Macro ใหม่ ไม่สร้าง Cronซ้ำ ไม่เพิ่มGold scoreเพื่อให้coverageเต็ม ไม่เพิ่มปฏิทินVIXYที่ผู้ใช้ปฏิเสธ

---

# AUD/THB — บันทึกสถานะจากโค้ดจริง

วันที่ตรวจ: 2026-09-16
แหล่งหลัก: audthb-project(1).zip ที่ผู้ใช้ส่งในแชทนี้
ขอบเขต: ตรวจโครงสร้าง ไฟล์หน้าจอ เส้นทางข้อมูล ตารางที่โค้ดอ่าน/เขียน สูตรรวม และจุดเชื่อมสำคัญ ไม่ใช่การทดสอบทุก branch หรือรับรองผล production
ไม่มีการแก้โค้ดโปรเจกต์ ไม่มีการเรียก API ingestion หรือเขียนฐานข้อมูล ไม่มีการ Build ใหม่ในการตรวจนี้ ผู้ใช้ยืนยัน Build/Push ผ่านก่อนส่ง ZIP

## ข้อกำหนดการทำงานต่อ
- ใช้โค้ดชุดนี้เป็น baseline; ตรวจการเปลี่ยนแปลงภายหลังร่วมกับบันทึกนี้
- สอนทีละขั้น ให้โค้ด inline ไม่เปลี่ยนไปส่งชุดโค้ด ZIP โดยไม่จำเป็น
- ผู้ใช้รันบน Windows PowerShell: ใช้ npm.cmd
- ตรวจของเดิมก่อนสร้างไฟล์ ตาราง API หรืองานตั้งเวลาเพิ่ม
- คง VIXY เวลา จ–ศ 09:30–16:00 America/New_York ปรับ DST ด้วย Intl
- ไม่เพิ่มปฏิทินวันหยุด/วันปิดเร็วหรือ API ปฏิทินตามที่ผู้ใช้เลือก
- fx_score_snapshots เป็นข้อเสนอในแชทเท่านั้น ผู้ใช้ยืนยันว่าไม่ได้สร้าง
- ไม่ถือว่าตารางไม่มีใน Supabase เพียงเพราะไม่พบใน source; ไม่มีสิทธิ์อ่าน schema production ในรอบนี้

## Stack และโครงสร้าง
Next.js 16.3.4, React 19.2.8, TypeScript, Tailwind 4, Supabase JS, ExcelJS.
app/page.tsx เป็น dynamic dashboard; getDashboardData เป็นตัวรวมข้อมูล
components: CurrentRateCard, MarketRates, DataHealth, MarketClock, ScoreBreakdown, RefreshControls
lib: dashboard-data, commodity-data, risk-data, macro-data, macro-composite-data, inflation-data, labour-data, growth-data, supabase-server
AGENTS.md กำหนดให้อ่านเอกสาร Next ที่ติดตั้งก่อนเขียนโค้ด; ไม่มี node_modules ใน archive

## งานที่มีใน source แล้ว
- ราคาจาก Twelve Data; AUD/THB, AUD/THB_DIRECT, AUD/USD, USD/THB และคู่เงินเอเชีย
- Cross AUD/USD × USD/THB มีจับเวลาและเทียบ direct
- การเปลี่ยนแปลงย้อนหลัง 1H/4H และ intraday ตามวันไทย
- FX Score, Bias, available weight, freshness และ breakdown
- Relative market: AU–US 2Y yield spread change 1W + USD/CNH + USD/SGD
- Commodity: Brent live, Iron Ore, Gold monitor และ Brent historical reference
- Macro: Policy + Inflation + Labour + Growth รวมเข้า FX score แล้ว
- Risk: VIXY; มีการกันราคาผิด เวลาอนาคต และตรวจคู่ราคาใน session วันเดียวกันตามที่แก้ล่าสุด
- รีเฟรชหน้าอัตโนมัติทุก 60 วินาที; นาฬิกาไทย/Sydney อัปเดตทุกวินาที
- API ingestion และ status หลายชุด มี retry/partial results ในหลายเส้นทาง

## ตารางที่โค้ดอ้างถึง (7 ตาราง)
| ตาราง | หน้าที่ | เส้นทางหลักที่เขียน |
|---|---|---|
| market_prices | FX และ VIXY history | /api/market, /api/relative-market, /api/risk |
| commodity_prices | Gold/Brent/Iron Ore history | /api/commodity, /api/commodity-daily, /api/iron-ore |
| yield_snapshots | AU/US yield + spread | /api/yields |
| bot_policy_history | ประวัติ policy ไทย | /api/macro-policy |
| macro_policy_snapshots | rates/spreads และการเปลี่ยนแปลงย้อนหลัง | /api/macro-policy |
| inflation_observations | CPI AU/US/TH | /api/inflation |
| labour_observations | employment/unemployment/participation ฯลฯ | /api/labour |

ชื่อ snapshot ที่พบเป็นข้อมูลปัจจัย ไม่ใช่ snapshot คะแนนรวมโดยอัตโนมัติ
Growth ดึง IMF ตอนคำนวณ ไม่มี database writes ใน growth-data
ไม่พบ SQL migrations/schema dump ใน ZIP จึงยังยืนยัน indexes, RLS, triggers, functions และตารางที่โค้ดไม่อ้างถึงไม่ได้

## โมเดลคะแนนที่ใช้อยู่
| ปัจจัย | น้ำหนักวางแผนสูงสุด |
|---|---:|
| Price Momentum | 35 |
| Cross Currency | 20 |
| Relative Market | 15 |
| Commodity | 10 |
| Risk | 5 |
| Mean Reversion | 5 |
| Macro | 10 |
| รวม | 100 |

คะแนนรวม = round(sum(score × effective weight) / sum(effective weight))
ตัดปัจจัย score=null หรือ weight<=0 ไม่คิดข้อมูลขาดเป็น score=0
Bias >=40 Strong Bullish; >=15 Bullish; <=-40 Strong Bearish; <=-15 Bearish; ที่เหลือ Neutral

- Price: 1H×60% + 4H×40%; มี fallback หากมีเพียงหนึ่งช่วง
- 1H thresholds: ±0.05/0.10/0.20/0.30% → ±25/50/75/100
- 4H thresholds: ±0.10/0.20/0.40/0.70% → ±25/50/75/100
- Cross ใช้เกณฑ์ 1H; Asian FX กลับเครื่องหมายเกณฑ์ 1H
- Relative internal weights: yield 50, CNH 35, SGD 15; effective FX weight=15×coverage/100
- Yield score thresholds ±3/7.5/15/25 bps → ±25/50/75/100; freshness ปรับน้ำหนัก
- Commodity internal: Iron Ore 50, Brent 30, Gold 20 ที่ยัง monitor-only จึง active สูงสุด 80 และ FX weight สูงสุดจริงปัจจุบัน 8/10
- ดังนั้น full active coverage ปัจจุบันสูงสุด 98/100 ไม่ใช่บั๊กเมื่อข้อมูลครบ; หาก Risk ปิดตลาดจะเหลือได้สูงสุด 93/100
- Brent 1H thresholds ±0.25/0.5/1/1.5%; Iron Ore 24H thresholds ±0.5/1/2/3%
- Mean reversion: -2×(range position−50), clamp -100..100
- Macro internal FX weights: Policy 4, Inflation 3, Labour 2, Growth 1
- Policy: AU–US และ US–TH policy spread changes 90D; 50/50
- Inflation: headline 40%, underlying 60%; AU–US และ US–TH 50/50; AU–TH diagnostic only; เกณฑ์ยังต้อง calibrate
- Labour: AU/US seasonally-adjusted momentum 3M; TH YoY; AU–US และ US–TH 50/50; earnings US monitor-only
- Growth: IMF QNEA real SA GDP QoQ ไม่ annualize; AU–US/US–TH 50/50; spread thresholds ±0.1/0.25/0.5/1pp; ตัดไตรมาสที่ยังไม่จบและเก่ากว่า180วัน; EXPERIMENTAL
- Risk: VIXY 1H ขึ้นให้ลบ ลงให้บวก; magnitude 0.5/1/2/3% →25/50/75/100; fresh<=75min weight5, <=120min weight2.5, stale/closed/missing weight0

## ข้อค้นพบสำคัญที่เปลี่ยนความเข้าใจจากแชทก่อน
1. app/page.tsx ยังแสดง Model Coverage /90 และข้อความ Full model target 100 after Macro แม้ lib/dashboard-data.ts รวม Macro แล้วครบ100 ต้องแก้เฉพาะข้อความหน้าจอ ไม่สร้าง Macro ซ้ำ
2. Forecast ใน app/page.tsx เป็น placeholder 'ยังไม่เปิดใช้' และระบุรอ calibrate/backtest; ไม่พบ implementation สร้างกรอบ 1H/4H ใน source นี้
3. ไม่พบ implementation บันทึกคะแนนรวม/forecast snapshot หรือประเมินผล backtest ใน source นี้; อย่าสับสนกับ yield_snapshots และ macro_policy_snapshots
4. RefreshControls.tsx return null มี auto refresh อย่างเดียว ผู้ใช้ยืนยันจากสรุปงานเดิมว่าตั้งใจซ่อน Refresh UI ไม่ใช่งานตกหล่น ห้ามเพิ่มปุ่มกลับโดยอัตโนมัติ
5. README.txt เป็นเอกสารเก่าสมัย Growth PENDING_SCORING ไม่ตรง growth-data.ts ปัจจุบัน ต้องไม่ใช้ README นี้ย้อนสถานะงาน
6. Gold ยัง monitor-only; planned100 ไม่เท่ากับ active100
7. macro-data.ts และ /api/macro-status เป็นเส้นทาง policy เดิม; dashboard ใช้ macro-composite-data.ts ที่รวม4ส่วน อย่าใช้ endpoint เดิมสรุปว่าไม่มี Inflation/Labour/Growth
8. IMF fetch cache:no-store timeout30s ถูกเรียกจาก macro ซึ่ง dashboard เรียกทุก refresh; ควรพิจารณา cache/ingestion ภายหลัง ไม่กล่าวว่ามีแล้ว
9. ผู้ใช้ส่งสรุปงานเดิมยืนยันว่า scheduler อยู่ใน Supabase Cron; ไม่อยู่ใน archive เป็นเรื่องปกติ ต้องต่อกับงานเดิม ไม่สร้าง scheduler อีกชุด โดยสถานะ runtime ปัจจุบันยังไม่ได้ตรวจสด
10. ไม่พบระบบข่าว/ปฏิทินเศรษฐกิจ/แจ้งเตือน/สรุปรายวันใน source นี้

## ประเด็นที่ควรตรวจเมื่อกลับมาปรับคุณภาพ
- auth หลาย route เทียบกับ Bearer ${process.env.CRON_SECRET} โดยไม่เช็ก missing secret ก่อน ต่างจาก growth-status ที่เช็กแล้ว; ปรับให้ fail closed เมื่อทำรอบ API hardening
- Mean Reversion ไม่มี freshness guard โดยตรงในบล็อกคำนวณ; ต้องตรวจพฤติกรรมเมื่อราคาค้างก่อนนับโมเดลพร้อมพยากรณ์
- การปิดตลาด FX ใน helper ใช้เสาร์/อาทิตย์ตามวันไทย เป็น approximation; คงแยกจากนโยบาย VIXY ที่ผู้ใช้เลือก
- snapshots ปัจจัยใช้ upsert อาจทับ revision จึงไม่เท่ากับ point-in-time historical data สำหรับ backtest
- Source static inspection ไม่รับรองว่า jobs ทำงานสด provider ตอบสำเร็จ หรือ production schema ตรงทั้งหมด

## ลำดับต่อที่เหมาะสม
1. แก้ข้อความ Model Coverage /100 และ Active factors ให้รวม Macro โดยใช้ logic เดิม
2. ตรวจ schema production เฉพาะตอนต้องเพิ่มประวัติคะแนน เพื่อยืนยันว่าจะไม่สร้างซ้ำของที่อยู่นอก source
3. ถ้ายังไม่มีจริง เพิ่มการเก็บคะแนนพร้อมเวลาออกรายงาน เวลาอ้างอิงราคา เวอร์ชันโมเดล และปัจจัย ณ ขณะนั้น โดยไม่เขียนทับ snapshot เดิมจากการ refresh
4. สร้างการประเมินผลหลัง1H/4H พร้อมเกณฑ์เวลาจับคู่ ข้อมูลขาด ช่วงตลาดปิด และป้องกัน look-ahead
5. สร้างและ calibrate forecast range หลังมีหลักฐานวัดผล ไม่แสดง confidence เป็นความแม่นยำที่ยังไม่ได้ทดสอบ

## หลักฐานสถานะจากบทสนทนาปัจจุบัน
ผู้ใช้ยืนยัน Build/Push สำหรับ Macro และ VIXY validation ผ่านแล้ว
ผู้ใช้ปฏิเสธปฏิทินวันหยุดแบบดูแลเอง; ยังไม่ได้วางโค้ด calendar
ผู้ใช้ยังไม่ได้รัน SQL fx_score_snapshots
ตัวเลข Macro22/Growth38 ที่ส่งก่อนหน้าเป็นตัวอย่างผล ณ ตอนนั้น ไม่ใช่ค่าคงที่หรือข้อมูลสด

## API inventory ที่สกัดจาก source
- `/api/abs-cpi-series-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/au-labour-xlsx-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/bot-policy-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/bot-stat-search-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/commodity` — ingestion; tables: commodity_prices; upsert key: symbol,market_timestamp
- `/api/commodity-daily` — ingestion; tables: commodity_prices; upsert key: symbol,market_timestamp
- `/api/commodity-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/growth-imf-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/growth-source-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/growth-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/inflation` — ingestion; tables: inflation_observations; upsert key: country,metric_code,reference_period
- `/api/inflation-source-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/inflation-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/iron-ore` — ingestion; tables: commodity_prices; upsert key: symbol,market_timestamp
- `/api/labour` — ingestion; tables: labour_observations; upsert key: country,metric_code,reference_period
- `/api/labour-observation-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/labour-source-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/labour-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/latest-price` — diagnostic/test; tables: market_prices
- `/api/macro-composite-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/macro-policy` — ingestion; tables: bot_policy_history, macro_policy_snapshots; upsert key: announcement_date; rba_reference_date,fed_reference_date
- `/api/macro-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/macro-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/market` — ingestion; tables: market_prices; upsert key: symbol,market_timestamp
- `/api/relative-market` — ingestion; tables: market_prices; upsert key: symbol,market_timestamp
- `/api/risk` — ingestion; tables: market_prices; upsert key: symbol,market_timestamp
- `/api/risk-status` — status/read; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/risk-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/th-growth-observation-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/th-growth-source-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/th-inflation-test` — diagnostic/test; tables: ไม่มี direct DB reference (อาจเรียก lib)
- `/api/yields` — ingestion; tables: yield_snapshots

## Source inventory / SHA256

ใช้เทียบว่าไฟล์เปลี่ยนหลังตรวจหรือไม่ ไม่ใช่ Git commit ID

- `.gitignore` — `cfdbd5a321f3ba279e434c025fc9a44bf2d3bd3a1af5affb8429d79bd18af054`
- `AGENTS.md` — `ec1b6e023814ae1a510b02ea62229e5eb035d75e39e3335d5ea7f5ce5654d567`
- `CLAUDE.md` — `d631d88045f74623d568adfb4783b72e3d1b732330d749bc6c72e6648d4581d3`
- `README.md` — `3b3ed71ebf50e973209bc634f6849e8ecf235a6c0686c285e1f36af5caa1c2cc`
- `README.txt` — `04b3bd669925cf72e146dd76b36885bd78c21039b9cd4dacfa8977341066dbcd`
- `app/api/abs-cpi-series-test/route.ts` — `1ae8101ca8f8945c86736d211815bdeabec0717f3fccfc680e2542053b9af75a`
- `app/api/au-labour-xlsx-test/route.ts` — `14362123fa5f39e75daab2c02cbc609c8774afd8880d72274dc55577cec03aed`
- `app/api/bot-policy-test/route.ts` — `1961228780a1756b8ac95ffa32697c0922487cae6fb8de9d3ff6d4aa66ad5fae`
- `app/api/bot-stat-search-test/route.ts` — `eb325ce440ec888565e0d43059efc9a189f7977739643e705d26a5a4bd6c2a66`
- `app/api/commodity/route.ts` — `360f676547e78b391976293d2c5040fd1d8fe4dcba84300e479292f3ca22fc1f`
- `app/api/commodity-daily/route.ts` — `066aff84e761dad4e9be457841003f1d7ca97d13c60efa3590f5cbde16c491d7`
- `app/api/commodity-status/route.ts` — `c8958a81796768d49c1c7d6fc8ffea2435316f6ef3afdbca09f38392c4af24a1`
- `app/api/growth-imf-test/route.ts` — `7efc1f2fbc05ca335b55465185bca85b76938166608ff30e0623d9dfbf156e32`
- `app/api/growth-source-test/route.ts` — `93a7c6fda7bdc471be905a1a478af4d062085abc30c7a0b14b4cb1d11d37ef25`
- `app/api/growth-status/route.ts` — `b41947e3567a08d534b26f24190e6db0a9ca43e004aa0d94bb91978606e65ab3`
- `app/api/inflation/route.ts` — `e3f827a9166454f134b91c67b519197c7d521df18f58500602d96c4fab6051fc`
- `app/api/inflation-source-test/route.ts` — `e1f2405e8c6cd647016a4f73e3477624a4659dd04b5af88f525242deb178095c`
- `app/api/inflation-status/route.ts` — `f7390e3beead97f941f5957422d3ca8c247b258bc6e247beff86c535fd5542db`
- `app/api/iron-ore/route.ts` — `acf896ffffc20299e2ca656b5d3f5771971913aa41989beab1a6f8854d3ffcc6`
- `app/api/labour/route.ts` — `5027cf3ac03abe73362eeac48a40602e68977089b51eec8ee3351c01efa580e6`
- `app/api/labour-observation-test/route.ts` — `8236c47ee1dab1b083a68809497d8ecd7f6ada4b8e3a90a43c9225c5a8d0818d`
- `app/api/labour-source-test/route.ts` — `4195ca2afe157cc860ad7a2796b42653446580dfd1b7b82826265ba0d7bcc8c5`
- `app/api/labour-status/route.ts` — `de26dc88c0cc9f47887679f8cbdee0cd29b0e98056ee0fc325df4cb7d1bed71c`
- `app/api/latest-price/route.ts` — `af31dfe401ca16c187a2882cb0a73ac65b790e07ede74ec8b1ee172238018920`
- `app/api/macro-composite-status/route.ts` — `9c36d81957b0caade0f204f98c91612e376e649408a9a0e048a087d7daadc5ba`
- `app/api/macro-policy/route.ts` — `499c79fc336b9cd1125ea9f3c6f36cd891712321efa73a420f9df18bbc532d02`
- `app/api/macro-status/route.ts` — `be6d6ab2438c900a85f12660cf0daec2ed03bfe53bf1f20854edc5bd2df9aab3`
- `app/api/macro-test/route.ts` — `8ff12f9166295256d9186c9578e31e2a2be8c78450ab3f92bb6dbb54e35ed195`
- `app/api/market/route.ts` — `f1efba0a5868a2d0314c95845ed005e336bdaa742c2c216c8ead7f64fc0fd83d`
- `app/api/relative-market/route.ts` — `a58bfa12cc45ad5d951f439d9ca09e0399f35dbedce4f723a7b412b8fb99234d`
- `app/api/risk/route.ts` — `2ad6bd549eb77455ed29712f2fe37f39e2c22bac800a4fc905359f69bef642e1`
- `app/api/risk-status/route.ts` — `c35e446177fde8d0d4ade4083f20d7c88e833c5f8e9a098f57f77b3dbb1eac8e`
- `app/api/risk-test/route.ts` — `78a4da201eebd2ce123e4ab6e7c55ac9455c642f3dd90eb1a5f6fa84227703e6`
- `app/api/th-growth-observation-test/route.ts` — `c1d90edaf049e0949904aa356dd3997d26167def5f09b256a1e04c14c0753967`
- `app/api/th-growth-source-test/route.ts` — `ce8b718f62ea51361955da1138102d72fbd22fb8661ec956912cda30788e3cac`
- `app/api/th-inflation-test/route.ts` — `8df5a56d145e783c0e2c680fd54b6bc285499b98f237fb930db699eaacafa453`
- `app/api/yields/route.ts` — `a95c73b483b05f64faf99f0430edd6a1cb2097c5bbc8468ca82d89e593196260`
- `app/favicon.ico` — `2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932`
- `app/globals.css` — `94d307fb925a3264dd331975b5e17170b1d887f361669cf839bdf37cc7a40db8`
- `app/layout.tsx` — `66664f58175ae99218248456ae33c50deb26f6d3b681d0c1914577ebdd7babfc`
- `app/page.tsx` — `2de03b379a5aeeff97a998acff8e6eda397e59177807fcc397c186861b99d72a`
- `components/CurrentRateCard.tsx` — `58a675909afb2bed6c64fbf6672f50728df55693957926e8275c230d18f736ab`
- `components/DataHealth.tsx` — `4ae2747491ce876558c02dea5af3e85ad162fc97a0d1f9203f03db2dc226beb6`
- `components/MarketClock.tsx` — `df7e4cd1f99d41075352dbe1e0b62d626bf42433d6b4d2f89b1329997771bda6`
- `components/MarketRates.tsx` — `fa6baa6cee5b53ae4a7b78fcf273e7ac4a20fd6d7a016c8ee1a292d6a80e0a27`
- `components/RefreshControls.tsx` — `45fd22c9aedc24ef818a02a95f8cb96d7e5df1f7bbb437a26f51d546770bf664`
- `components/ScoreBreakdown.tsx` — `260a14d5c6d5c92c3acddac2c1b266bdcb2780e746e0f6264a058607401f3836`
- `eslint.config.mjs` — `275a07c13fc7c83a652efcfa9fb6a207c451a2f5088e6793415ce44281285720`
- `lib/commodity-data.ts` — `472d395f8a5711034d1186091233db67ac5e5d55fac2dbce7eefd79b877fb4a3`
- `lib/dashboard-data.ts` — `9324929be37a4dd9afec0fad6c38234ff2eff258532843dc47b355a438122afe`
- `lib/growth-data.ts` — `de4d90dbdc4db9f65025f968450df4ddfa464f5380156d2d4d00ee12a00ec7c4`
- `lib/inflation-data.ts` — `68caa99bb11581b65b15da4bbeb55984c172a99a6f8414d40703d92d0cdd612a`
- `lib/labour-data.ts` — `715738472d51af43eff65f6129ba54d022bc88c3a0c10f9ac19798ac5b44f724`
- `lib/macro-composite-data.ts` — `17ecf66004b8e96d71b34fe06662bf5a845882e4af000ae1f02ab10c1519c5f5`
- `lib/macro-data.ts` — `6c6321ddcbc377845a36de592208e22b58dcb7a2a5b64f6777b21f56e04abe04`
- `lib/risk-data.ts` — `e45674491bfd9cf053b15fc280e0a2856618fefa20c1ca54eeb90c5e2429bfba`
- `lib/supabase-server.ts` — `2caeab3005d6946e238070d59503539c379b4a58ee0063b44fe87e6f7fb372f1`
- `next.config.ts` — `a972c4f0ffa6dd714e7909b02d1ac19d2f2fe3d01f191efd2c5054bd6f142ec1`
- `package-lock.json` — `bcf48827fc966cd72270b42c3e526fea479a44d2369ec86bc7c4e6c250556047`
- `package.json` — `670727b862dafd2c02ba305837488ed6769120d2279ecf7613a18c44866219d4`
- `postcss.config.mjs` — `7b299d3d3b16699ddda397c0b2373b3af4f25f8fc9ccc9b3d9e64ef083bc1c21`
- `public/file.svg` — `2b67812c325c199a02536cdbeea0c593a72f707d323b72ee3e08dbab06753bd4`
- `public/globe.svg` — `b614b9bf183925957661ac851498fe1d8029fd43a62fbfed86f9e2624a57e7cf`
- `public/next.svg` — `55995dfad6ecb4945a1e856ddca03c5e16aa5bf13fd21b4df6a74ae79357bcfc`
- `public/vercel.svg` — `f081337b2fee635b455b63275406a3e7f39d6a014e25ad90dab5a67e62a12ac4`
- `public/window.svg` — `644768c4aaeb4767bce293344eeb0c125fb804a94d801440424072202d85e3a1`
- `tsconfig.json` — `fbff01604d6cb54694be707f26e7a0eb21a6ef796b888c6a1dab1839fa7c6ccc`
