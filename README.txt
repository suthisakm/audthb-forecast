AUD/THB — Growth data integration (scoring pending)

วางไฟล์ในโฟลเดอร์ audthb-forecast:
1. เพิ่ม lib/growth-data.ts
2. เพิ่ม app/api/growth-status/route.ts
3. สำรอง lib/macro-composite-data.ts เดิม แล้วแทนด้วยไฟล์ชื่อเดียวกันในชุดนี้

ไม่ต้องเพิ่มตาราง Supabase ไม่มี database writes
ใช้ IMF endpoint และ optional IMF_SDMX_SUBSCRIPTION_KEY ตามโค้ดที่ส่งมา
route ใหม่ใช้ CRON_SECRET เดิม และไม่รับคำขอถ้ายังไม่ได้ตั้ง secret

ทดสอบ:
เปิด Terminal ในโปรเจค แล้วรัน npm run dev
เปิด PowerShell อีกหน้าหนึ่ง ใช้คำสั่งต่อไปนี้ (ใส่ CRON_SECRET ของตัวเองเฉพาะในเครื่อง ไม่ต้องส่งในแชต):

$growthSecure = Read-Host 'CRON_SECRET' -AsSecureString
$growthCredential = [System.Net.NetworkCredential]::new('', $growthSecure)
$growthHeaders = @{ Authorization = 'Bearer ' + $growthCredential.Password }
Invoke-RestMethod -Uri 'http://localhost:3000/api/growth-status' -Headers $growthHeaders | ConvertTo-Json -Depth 12
Remove-Variable growthHeaders,growthCredential,growthSecure

ผลที่คาดถ้า IMF ยังส่งข้อมูลชุดเดียวกับไฟล์ทดสอบ:
status: PENDING_SCORING
countries.australia.qoqPercent: 0.4195
countries.unitedStates.qoqPercent: 0.3689
countries.thailand.qoqPercent: -0.185
comparisons.audUsd.differencePp: 0.0506
comparisons.usdThb.differencePp: 0.5539
Data coverage: 100; score: null; scored coverage: 0; effectiveFxWeight: 0

ตรวจ endpoint macro-composite-status ที่มีอยู่เดิมด้วยวิธีเรียกเดิม
Growth จะมี countries และ comparisons เพิ่มขึ้น ส่วนคะแนนรวมคงเดิมเมื่อข้อมูลปัจจัยอื่นคงเดิม

สถานะและข้อจำกัด:
- เป็นขั้นเชื่อมข้อมูล GDP ไม่ใช่ Growth scoring engine ที่เสร็จแล้ว
- ยังไม่มี thresholds, leg weights หรือ freshness policy ที่ยืนยันจากโค้ดเดิม จึงไม่สร้างคะแนนขึ้นเอง
- ข้อมูลครบไม่ได้แปลว่าสดใหม่; ดู latest.period ของแต่ละประเทศ
- เปรียบเทียบเฉพาะไตรมาสเดียวกัน และ QoQ ต้องมีไตรมาสก่อนหน้าต่อเนื่อง
- ใช้การเติบโต QoQ ไม่ annualize; ไม่ใช่ GDP surprise เทียบ consensus
- Growth/Activity อื่น เช่น PMI, retail sales และ industrial production ยังไม่ได้เชื่อม
- แต่ละครั้งที่เรียก macro จะรอ IMF เพิ่ม (timeout 30 วินาที); ยังไม่ได้เพิ่ม cache หรือ scheduled ingestion
- API ล้มเหลวจะให้ Growth UNAVAILABLE และ weight 0 โดยไม่ทำให้ปัจจัยอื่นล้มตาม
- ทดสอบคำนวณจากไฟล์แนบและกรณีข้อมูลผิดปกติแล้ว ยังไม่ได้รัน Next.js build ทั้งโปรเจค หรือเรียก IMF สดในรอบนี้
- ยังไม่ได้ deploy
