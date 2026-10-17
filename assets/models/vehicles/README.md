# نماذج المركبات (GLB)

اللعبة بتدوّر هنا على `manifest.json`. لو مش موجود أو النموذج ناقص، بتستخدم المجسمات المبنية بالكود (بديل مؤقت).

## تجهيز نموذج
1. ضع الملف `taxi.glb` (أو أى اسم) فى هذا الفولدر. لازم يكون **مرخّص للاستخدام** (CC0 أو CC-BY مع ذكر المصدر) وبدون شعارات شركات.
2. المقدمة تبقى ناحية **-Z** (لو لأ، استخدم `yaw` فى المانيفست: 3.14159 لقلب الاتجاه).
3. سمّ خامة الطلاء `body` (أو `paint`) عشان اللون يتغير من اللعبة.
4. سمّ عقد العجلات `wheel_fl` و`wheel_fr` و`wheel_rl` و`wheel_rr` (عشان تلف أثناء القيادة).
5. سجّله فى `manifest.json`:

```json
{
  "taxi": { "file": "taxi.glb", "yaw": 0, "bodyMaterials": ["body"],
            "wheelNodes": ["wheel_fl","wheel_fr","wheel_rl","wheel_rr"],
            "license": "CC0 - المصدر: ..." }
}
```

الأنواع المدعومة: `taxi, sedan, hatch, coupe, suv, gwagon, luxury, microbus, tonaya, lada, tuktuk, tuktuk2, pickup, boxtruck, truck, bus, moto`.
حجم النموذج بيتظبط تلقائيا على طول المركبة فى اللعبة (من غير تغيير فى التصادم). يفضّل أقل من 15 ألف مثلث للسيارة و8 آلاف للمرور.
