"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pool = new pg_1.Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER ?? 'rag_user',
    password: process.env.POSTGRES_PASSWORD ?? 'rag_password',
    database: process.env.POSTGRES_DB ?? 'rag_db',
});
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
const fmt = (d) => d.toISOString().split('T')[0];
const fmtTs = (d) => d.toISOString();
const MALE = ['علی', 'محمد', 'رضا', 'حسین', 'مهدی', 'امیر', 'سعید', 'کامران', 'بهزاد', 'فرهاد', 'پوریا', 'آرش', 'نیما', 'سهیل', 'بابک', 'داریوش', 'شاهین', 'کاوه', 'ایمان', 'وحید', 'سینا', 'پویا', 'علیرضا', 'مجتبی', 'امیرحسین', 'محمدرضا', 'صادق', 'جواد', 'حمید', 'یوسف'];
const FEMALE = ['مریم', 'فاطمه', 'زهرا', 'سارا', 'نگار', 'لیلا', 'شیرین', 'نازنین', 'پریسا', 'الهام', 'آرزو', 'سمانه', 'یاسمن', 'ریحانه', 'مهسا', 'شادی', 'آناهیتا', 'نیلوفر', 'سپیده', 'رویا', 'ترانه', 'مینا', 'ثمین', 'راحله'];
const LAST = ['محمدی', 'احمدی', 'حسینی', 'رضایی', 'کریمی', 'زارعی', 'موسوی', 'نوری', 'صادقی', 'علوی', 'مرادی', 'قاسمی', 'رحیمی', 'نظری', 'طاهری', 'ابراهیمی', 'جعفری', 'شیرازی', 'تهرانی', 'مشهدی', 'اصفهانی', 'خادمی', 'سلیمانی', 'منصوری', 'یوسفی', 'اکبری', 'حیدری', 'پارسا', 'باقری', 'ملکی'];
const maleName = () => `${rand(MALE)} ${rand(LAST)}`;
const femaleName = () => `${rand(FEMALE)} ${rand(LAST)}`;
const anyName = () => Math.random() > 0.4 ? maleName() : femaleName();
const CITIES = {
    'تهران': 'تهران', 'اصفهان': 'اصفهان', 'مشهد': 'خراسان رضوی', 'شیراز': 'فارس',
    'تبریز': 'آذربایجان شرقی', 'اهواز': 'خوزستان', 'رشت': 'گیلان', 'کرمان': 'کرمان',
    'اراک': 'مرکزی', 'بندرعباس': 'هرمزگان', 'قم': 'قم', 'کرج': 'البرز',
    'همدان': 'همدان', 'ارومیه': 'آذربایجان غربی', 'یزد': 'یزد', 'زاهدان': 'سیستان و بلوچستان',
    'گرگان': 'گلستان', 'ساری': 'مازندران', 'بوشهر': 'بوشهر', 'سنندج': 'کردستان',
};
const cityList = Object.keys(CITIES);
const INDUSTRIES = ['فناوری اطلاعات', 'تولید و صنعت', 'بازرگانی و تجارت', 'خدمات مالی و بانکی', 'ساختمان و مسکن', 'بهداشت و درمان', 'حمل و نقل و لجستیک', 'کشاورزی و صنایع غذایی', 'انرژی و نفت و گاز', 'خرده‌فروشی و توزیع', 'صادرات و واردات', 'مشاوره و خدمات کسب‌وکار', 'آموزش و پژوهش', 'هتل‌داری و گردشگری'];
const COMP_W1 = ['پارس', 'ایران', 'آریا', 'سینا', 'مهر', 'کوروش', 'البرز', 'دماوند', 'هخامنش', 'پاسارگاد', 'آپادانا', 'زاگرس', 'نوین', 'پیشرو', 'رشد', 'تدبیر', 'افق', 'نیک', 'سپاد', 'برنا'];
const COMP_W2 = ['فناوری', 'صنعت', 'بازرگانی', 'تجارت', 'توسعه', 'مهندسی', 'سیستم', 'راهکار', 'گستر', 'پردازش', 'ارتباط', 'اندیشه', 'پویا', 'نما', 'دیجیتال', 'هوشمند'];
const COMP_PREFIX = ['شرکت', 'گروه', 'مجموعه', 'موسسه'];
const genCompany = () => `${rand(COMP_PREFIX)} ${rand(COMP_W1)} ${rand(COMP_W2)}`;
const POSITIONS = ['مدیرعامل', 'مدیر مالی', 'مدیر فروش', 'مدیر بازرگانی', 'مدیر IT', 'مدیر خرید', 'کارشناس خرید', 'کارشناس فروش', 'کارشناس مالی', 'مسئول انبار', 'مدیر پروژه', 'مشاور ارشد'];
const EMP_ROLES = ['مدیر فروش', 'کارشناس فروش', 'مدیر حساب', 'پشتیبانی', 'مدیر ارشد', 'کارشناس بازاریابی'];
const DEPARTMENTS = ['فروش', 'بازاریابی', 'پشتیبانی', 'مدیریت', 'حسابداری'];
const LEAD_SOURCES = ['وب‌سایت', 'ارجاع', 'نمایشگاه', 'تماس سرد', 'شبکه‌های اجتماعی', 'تبلیغات', 'همایش', 'معرفی مشتری'];
const DEAL_STAGES = ['جستجو و کشف', 'ارزیابی', 'پیشنهاد', 'مذاکره', 'بسته شده - موفق', 'بسته شده - ناموفق'];
const ORDER_STATUS = ['در انتظار', 'تایید شده', 'ارسال شده', 'تحویل داده شده', 'لغو شده'];
const PAY_STATUS = ['پرداخت نشده', 'پرداخت جزئی', 'پرداخت شده'];
const ACT_TYPES = ['تماس تلفنی', 'ایمیل', 'جلسه حضوری', 'بازدید', 'دمو محصول', 'ارسال پیشنهاد'];
const ACT_OUTCOMES = ['مثبت', 'خنثی', 'منفی', 'بدون پاسخ', 'پیگیری نیاز است'];
const TICKET_CATS = ['فنی', 'مالی', 'محصول', 'تحویل', 'عمومی', 'شکایت'];
const TICKET_PRIORITIES = ['کم', 'متوسط', 'زیاد', 'فوری'];
const TICKET_STATUS = ['باز', 'در حال بررسی', 'حل شده', 'بسته شده'];
const CAMPAIGN_TYPES = ['ایمیل', 'پیامک', 'رویداد', 'شبکه‌های اجتماعی', 'نمایشگاه', 'وبینار'];
const PRODUCTS = [
    { name: 'نرم‌افزار CRM پیشرفته', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 15_000_000, maxP: 80_000_000, desc: 'سیستم مدیریت ارتباط با مشتریان با قابلیت‌های پیشرفته تحلیل داده و گزارش‌گیری' },
    { name: 'نرم‌افزار حسابداری ابری', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 8_000_000, maxP: 35_000_000, desc: 'نرم‌افزار حسابداری مبتنی بر ابر با پشتیبانی از استانداردهای ایران' },
    { name: 'سیستم مدیریت انبار', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 12_000_000, maxP: 60_000_000, desc: 'نرم‌افزار جامع مدیریت انبار و لجستیک با پشتیبانی از بارکد و RFID' },
    { name: 'پلتفرم هوش مصنوعی', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 50_000_000, maxP: 300_000_000, desc: 'پلتفرم یادگیری ماشین و هوش مصنوعی برای کسب‌وکارهای بزرگ' },
    { name: 'نرم‌افزار مدیریت پروژه', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 5_000_000, maxP: 25_000_000, desc: 'ابزار مدیریت پروژه و همکاری تیمی با داشبوردهای پیشرفته' },
    { name: 'سرور اچ‌پی ProLiant DL380', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 180_000_000, maxP: 450_000_000, desc: 'سرور رک‌مونت دو پردازنده با قابلیت گسترش بالا' },
    { name: 'سرور Dell PowerEdge R740', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 200_000_000, maxP: 500_000_000, desc: 'سرور سازمانی با کارایی بالا برای محیط‌های حیاتی' },
    { name: 'لپ‌تاپ لنوو ThinkPad X1', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 45_000_000, maxP: 85_000_000, desc: 'لپ‌تاپ تجاری با امنیت پیشرفته و عمر باتری طولانی' },
    { name: 'لپ‌تاپ Dell Latitude 5520', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 35_000_000, maxP: 65_000_000, desc: 'لپ‌تاپ سازمانی سبک با پردازنده Intel Core i7' },
    { name: 'دوربین مداربسته هایک‌ویژن 4MP', cat: 'امنیت', unit: 'دستگاه', minP: 3_500_000, maxP: 8_000_000, desc: 'دوربین IP با وضوح 4 مگاپیکسل و شب‌بینی 30 متر' },
    { name: 'سیستم حضور و غیاب اثر انگشت', cat: 'امنیت', unit: 'دستگاه', minP: 8_000_000, maxP: 20_000_000, desc: 'دستگاه حضور و غیاب با اثرانگشت، کارت هوشمند و تشخیص چهره' },
    { name: 'کنترل دسترسی هوشمند', cat: 'امنیت', unit: 'دستگاه', minP: 12_000_000, maxP: 35_000_000, desc: 'سیستم کنترل تردد با مدیریت مرکزی و گزارش‌گیری لحظه‌ای' },
    { name: 'پنل خورشیدی 400 وات', cat: 'انرژی', unit: 'عدد', minP: 12_000_000, maxP: 18_000_000, desc: 'پنل فوتوولتائیک مونوکریستال با راندمان بالا' },
    { name: 'اینورتر خورشیدی 5KW', cat: 'انرژی', unit: 'دستگاه', minP: 35_000_000, maxP: 70_000_000, desc: 'اینورتر هیبریدی با قابلیت اتصال به شبکه' },
    { name: 'یو‌پی‌اس 6KVA APC', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 45_000_000, maxP: 90_000_000, desc: 'منبع تغذیه بدون وقفه آنلاین با مدیریت شبکه' },
    { name: 'سوئیچ شبکه 48 پورت Cisco', cat: 'شبکه', unit: 'دستگاه', minP: 25_000_000, maxP: 70_000_000, desc: 'سوئیچ مدیریت‌پذیر لایه 3 با پشتیبانی از POE+' },
    { name: 'روتر میکروتیک CCR2004', cat: 'شبکه', unit: 'دستگاه', minP: 15_000_000, maxP: 40_000_000, desc: 'روتر سازمانی با توان پردازش 4 هسته‌ای' },
    { name: 'فایروال Fortinet FortiGate', cat: 'شبکه', unit: 'دستگاه', minP: 80_000_000, maxP: 250_000_000, desc: 'دیوار آتش نسل بعدی با هوش مصنوعی تهدیدشناسی' },
    { name: 'خدمات ابری و هاستینگ سالانه', cat: 'خدمات', unit: 'سرویس', minP: 10_000_000, maxP: 60_000_000, desc: 'میزبانی ابری با SLA 99.9% و پشتیبانی ۲۴ ساعته' },
    { name: 'خدمات پشتیبانی IT سالانه', cat: 'خدمات', unit: 'قرارداد', minP: 20_000_000, maxP: 120_000_000, desc: 'قرارداد پشتیبانی سالانه شامل نگهداری پیشگیرانه و پشتیبانی فوری' },
    { name: 'آموزش و کارگاه تخصصی', cat: 'خدمات', unit: 'دوره', minP: 5_000_000, maxP: 30_000_000, desc: 'دوره‌های آموزشی تخصصی IT و نرم‌افزار با مدرک معتبر' },
    { name: 'مشاوره امنیت سایبری', cat: 'خدمات', unit: 'پروژه', minP: 30_000_000, maxP: 200_000_000, desc: 'ارزیابی امنیتی، تست نفوذ و ارائه راهکارهای حفاظتی' },
    { name: 'پرینتر لیزری HP LaserJet', cat: 'جانبی', unit: 'دستگاه', minP: 18_000_000, maxP: 45_000_000, desc: 'پرینتر لیزری تک‌رنگ سازمانی با سرعت 40 صفحه در دقیقه' },
    { name: 'دستگاه کپی توشیبا چندکاره', cat: 'جانبی', unit: 'دستگاه', minP: 65_000_000, maxP: 180_000_000, desc: 'دستگاه MFP رنگی با قابلیت اسکن، کپی، فکس و چاپ' },
    { name: 'تلفن VoIP گرنداستریم', cat: 'جانبی', unit: 'دستگاه', minP: 5_000_000, maxP: 15_000_000, desc: 'تلفن IP سازمانی با نمایشگر رنگی و پشتیبانی از PoE' },
    { name: 'هدست حرفه‌ای Plantronics', cat: 'جانبی', unit: 'دستگاه', minP: 3_000_000, maxP: 8_500_000, desc: 'هدست بی‌سیم سازمانی مناسب مرکز تماس' },
    { name: 'تابلو LED تبلیغاتی', cat: 'تبلیغات', unit: 'متر مربع', minP: 8_000_000, maxP: 25_000_000, desc: 'تابلو LED فول کالر با روشنایی بالا برای محیط‌های خارجی' },
    { name: 'نرم‌افزار ERP سازمانی', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 100_000_000, maxP: 800_000_000, desc: 'سیستم برنامه‌ریزی منابع سازمانی یکپارچه با ماژول‌های مالی، انبار و تولید' },
    { name: 'پلتفرم تجارت الکترونیک', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 25_000_000, maxP: 150_000_000, desc: 'فروشگاه آنلاین حرفه‌ای با درگاه پرداخت ایرانی و مدیریت محصولات' },
    { name: 'سیستم صندوق فروشگاهی POS', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 15_000_000, maxP: 35_000_000, desc: 'صندوق فروشگاهی هوشمند با نمایشگر لمسی و چاپگر رسید' },
    { name: 'دستگاه بارکدخوان صنعتی', cat: 'جانبی', unit: 'دستگاه', minP: 8_000_000, maxP: 22_000_000, desc: 'اسکنر بارکد مقاوم در برابر ضربه برای انبارداری و لجستیک' },
    { name: 'نرم‌افزار امنیت ایمیل', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 6_000_000, maxP: 28_000_000, desc: 'فیلتر ضد اسپم و ضد بدافزار برای سرورهای ایمیل سازمانی' },
    { name: 'NAS ذخیره‌ساز شبکه Synology', cat: 'سخت‌افزار', unit: 'دستگاه', minP: 30_000_000, maxP: 120_000_000, desc: 'ذخیره‌ساز شبکه 8 بِی با قابلیت RAID و بکاپ خودکار' },
    { name: 'سیستم ویدئوکنفرانس', cat: 'جانبی', unit: 'دستگاه', minP: 40_000_000, maxP: 150_000_000, desc: 'کیت ویدئوکنفرانس اتاق جلسه با دوربین 4K و میکروفن آرایه‌ای' },
    { name: 'خدمات پیاده‌سازی و استقرار', cat: 'خدمات', unit: 'پروژه', minP: 15_000_000, maxP: 300_000_000, desc: 'خدمات نصب، راه‌اندازی و آموزش محصولات IT' },
    { name: 'اینترنت اختصاصی سازمانی', cat: 'خدمات', unit: 'ماه', minP: 3_500_000, maxP: 25_000_000, desc: 'اینترنت اختصاصی با پهنای باند گارانتی‌شده و SLA' },
    { name: 'ماشین‌حساب مالی HP', cat: 'جانبی', unit: 'عدد', minP: 1_200_000, maxP: 3_500_000, desc: 'ماشین‌حساب مالی حرفه‌ای برای محاسبات پیچیده مالی' },
    { name: 'میز اداری ارگونومیک', cat: 'مبلمان اداری', unit: 'عدد', minP: 8_000_000, maxP: 30_000_000, desc: 'میز اداری با قابلیت تنظیم ارتفاع برقی' },
    { name: 'صندلی مدیریتی اورتوپدی', cat: 'مبلمان اداری', unit: 'عدد', minP: 12_000_000, maxP: 45_000_000, desc: 'صندلی اداری ارگونومیک با پشتیبانی کمر و تنظیم چندجهته' },
    { name: 'پارتیشن اداری شیشه‌ای', cat: 'مبلمان اداری', unit: 'متر مربع', minP: 4_000_000, maxP: 12_000_000, desc: 'پارتیشن دوجداره آلومینیومی با شیشه دو لایه' },
    { name: 'تخته هوشمند آموزشی', cat: 'آموزشی', unit: 'دستگاه', minP: 55_000_000, maxP: 130_000_000, desc: 'تخته تعاملی لمسی 86 اینچ با نرم‌افزار کلاس درس هوشمند' },
    { name: 'سیستم اعلام حریق آدرس‌پذیر', cat: 'امنیت', unit: 'سیستم', minP: 40_000_000, maxP: 200_000_000, desc: 'سیستم کشف و اعلام حریق با پنل مرکزی و دتکتورهای هوشمند' },
    { name: 'باتری لیتیوم صنعتی 48V', cat: 'انرژی', unit: 'عدد', minP: 65_000_000, maxP: 180_000_000, desc: 'باتری لیتیوم فسفاته برای سیستم‌های ذخیره انرژی' },
    { name: 'دستگاه تهویه صنعتی', cat: 'تجهیزات صنعتی', unit: 'دستگاه', minP: 25_000_000, maxP: 80_000_000, desc: 'هواکش صنعتی با موتور ECM برای اتاق سرور و سالن‌های صنعتی' },
    { name: 'نرم‌افزار مدیریت منابع انسانی', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 18_000_000, maxP: 90_000_000, desc: 'سیستم جامع HRM با ماژول حقوق و دستمزد و ارزیابی عملکرد' },
    { name: 'پهپاد صنعتی نقشه‌برداری', cat: 'تجهیزات صنعتی', unit: 'دستگاه', minP: 150_000_000, maxP: 600_000_000, desc: 'پهپاد حرفه‌ای با دوربین تصویربرداری هوایی و GPS دقیق' },
    { name: 'نرم‌افزار هوش تجاری BI', cat: 'نرم‌افزار', unit: 'لایسنس', minP: 35_000_000, maxP: 200_000_000, desc: 'پلتفرم تحلیل داده و داشبوردهای تعاملی برای تصمیم‌سازی مدیران' },
    { name: 'گیت کنترل تردد اتوماتیک', cat: 'امنیت', unit: 'دستگاه', minP: 85_000_000, maxP: 250_000_000, desc: 'گیت دوطرفه با پردازش تصویر و یکپارچگی با سیستم دسترسی' },
];
const NOTES_CUSTOMER = [
    'مشتری VIP با سابقه همکاری بلندمدت',
    'نیاز به پشتیبانی ویژه دارند',
    'توان خرید بالا، پتانسیل رشد فروش',
    'در حال بررسی محصولات جدید هستند',
    'رقابت با سازمان دیگری در این حساب وجود دارد',
    'مدیریت جدید در شرکت تغییر کرده است',
    'علاقه‌مند به راهکارهای یکپارچه هستند',
    'محدودیت بودجه در سال جاری دارند',
    'قرارداد پشتیبانی تمدید شده است',
    'در حال گسترش شعب هستند',
];
const NOTES_DEAL = [
    'مشتری درخواست تخفیف ویژه داشته است',
    'نیاز به ارائه دمو تکمیلی دارند',
    'رقیب اصلی ما قیمت پایین‌تری پیشنهاد داده',
    'مدیر مالی باید تأیید کند',
    'ملاحظات فنی نیاز به بررسی دارند',
    'در حال اخذ مجوزهای لازم هستند',
    'قرارداد در مرحله نهایی بررسی حقوقی',
];
const TICKET_DESC = [
    'مشکل در ورود به سیستم و احراز هویت کاربران',
    'خطا در صدور فاکتور و محاسبه مالیات',
    'عدم دریافت کالا در موعد مقرر',
    'نرم‌افزار پس از آپدیت کند شده است',
    'نیاز به آموزش تکمیلی کاربران',
    'اختلال در سیستم یکپارچه‌سازی با نرم‌افزار حسابداری',
    'مشکل چاپ و خروجی گزارشات',
    'درخواست افزودن کاربر جدید و تنظیم دسترسی',
    'پشتیبان‌گیری خودکار انجام نمی‌شود',
    'مشکل در اتصال VPN سازمانی',
];
const CAMPAIGNS = [
    { name: 'کمپین پاییزه راهکارهای ابری', type: 'ایمیل', desc: 'معرفی محصولات ابری به مشتریان فعلی و لیدهای سازمانی' },
    { name: 'نمایشگاه تخصصی فناوری اطلاعات تهران', type: 'نمایشگاه', desc: 'حضور در نمایشگاه الکامپ با غرفه اختصاصی و معرفی محصولات جدید' },
    { name: 'وبینار امنیت سایبری برای مدیران IT', type: 'وبینار', desc: 'آموزش مدیران IT در حوزه امنیت سایبری و معرفی راهکارهای امنیتی' },
    { name: 'کمپین پیامکی تخفیف شب یلدا', type: 'پیامک', desc: 'پیشنهاد تخفیف ویژه یلدا برای محصولات سخت‌افزاری' },
    { name: 'برنامه وفاداری مشتریان VIP', type: 'رویداد', desc: 'برنامه خاص برای مشتریان VIP شامل تخفیف، پشتیبانی اختصاصی و هدایای ویژه' },
    { name: 'کمپین لینکدین برای صنایع', type: 'شبکه‌های اجتماعی', desc: 'تبلیغات هدفمند در لینکدین برای صنایع تولیدی و بازرگانی' },
    { name: 'معرفی ERP برای شرکت‌های متوسط', type: 'ایمیل', desc: 'کمپین ایمیل مارکتینگ برای شرکت‌های 100 تا 500 نفر درباره راهکار ERP' },
    { name: 'همایش سالانه شرکا و مشتریان', type: 'رویداد', desc: 'رویداد سالانه جهت معرفی محصولات جدید، تقدیر از مشتریان و ارتقای روابط' },
];
async function seed() {
    const client = await pool.connect();
    try {
        console.log('🔄 Loading schema...');
        const schema = fs.readFileSync(path.join(__dirname, 'crm-schema.sql'), 'utf-8');
        await client.query(schema);
        console.log('✅ Schema created');
        console.log('Inserting employees...');
        const empNames = [
            { name: 'علیرضا صادقی', role: 'مدیر ارشد', dept: 'مدیریت', target: 5_000_000_000 },
            { name: 'فاطمه محمدی', role: 'مدیر فروش', dept: 'فروش', target: 3_000_000_000 },
            { name: 'رضا کریمی', role: 'کارشناس فروش', dept: 'فروش', target: 1_500_000_000 },
            { name: 'مریم احمدی', role: 'کارشناس فروش', dept: 'فروش', target: 1_200_000_000 },
            { name: 'سعید موسوی', role: 'مدیر حساب', dept: 'فروش', target: 2_000_000_000 },
            { name: 'نگار حسینی', role: 'مدیر حساب', dept: 'فروش', target: 1_800_000_000 },
            { name: 'کامران نوری', role: 'کارشناس فروش', dept: 'فروش', target: 1_000_000_000 },
            { name: 'زهرا رضایی', role: 'کارشناس فروش', dept: 'فروش', target: 900_000_000 },
            { name: 'مهدی قاسمی', role: 'کارشناس فروش', dept: 'فروش', target: 1_100_000_000 },
            { name: 'شیرین علوی', role: 'کارشناس بازاریابی', dept: 'بازاریابی', target: 500_000_000 },
            { name: 'امیر طاهری', role: 'کارشناس بازاریابی', dept: 'بازاریابی', target: 400_000_000 },
            { name: 'پریسا مرادی', role: 'مدیر حساب', dept: 'فروش', target: 1_600_000_000 },
            { name: 'بهزاد ابراهیمی', role: 'کارشناس فروش', dept: 'فروش', target: 1_300_000_000 },
            { name: 'الهام جعفری', role: 'پشتیبانی', dept: 'پشتیبانی', target: 0 },
            { name: 'نیما رحیمی', role: 'پشتیبانی', dept: 'پشتیبانی', target: 0 },
            { name: 'یاسمن نظری', role: 'پشتیبانی', dept: 'پشتیبانی', target: 0 },
            { name: 'فرهاد شیرازی', role: 'پشتیبانی', dept: 'پشتیبانی', target: 0 },
            { name: 'آرش تهرانی', role: 'کارشناس فروش', dept: 'فروش', target: 1_400_000_000 },
            { name: 'سارا منصوری', role: 'کارشناس فروش', dept: 'فروش', target: 1_000_000_000 },
            { name: 'داریوش یوسفی', role: 'مدیر فروش', dept: 'فروش', target: 2_500_000_000 },
        ];
        const empIds = [];
        for (let i = 0; i < empNames.length; i++) {
            const e = empNames[i];
            const slug = e.name.replace(' ', '.').toLowerCase();
            const { rows } = await client.query(`INSERT INTO crm_employees(name,role,email,phone,department,hire_date,target_sales)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [e.name, e.role, `${slug}@company.ir`, `09${randInt(10, 99)}${randInt(1000000, 9999999)}`, e.dept,
                fmt(randDate(new Date('2018-01-01'), new Date('2023-06-01'))), e.target]);
            empIds.push(rows[0].id);
        }
        console.log(`  ✅ ${empIds.length} employees`);
        console.log('Inserting products...');
        const productIds = [];
        for (let i = 0; i < PRODUCTS.length; i++) {
            const p = PRODUCTS[i];
            const price = randInt(p.minP, p.maxP);
            const { rows } = await client.query(`INSERT INTO crm_products(name,category,sku,description,unit_price,unit,stock)
         VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [p.name, p.cat, `SKU-${String(i + 1).padStart(4, '0')}`, p.desc, price, p.unit, randInt(0, 200)]);
            productIds.push(rows[0].id);
        }
        console.log(`  ✅ ${productIds.length} products`);
        console.log('Inserting customers...');
        const customerIds = [];
        const customerCityMap = {};
        const STATUSES = ['active', 'active', 'active', 'active', 'inactive', 'prospect'];
        for (let i = 0; i < 500; i++) {
            const city = rand(cityList);
            const { rows } = await client.query(`INSERT INTO crm_customers(company_name,industry,city,province,phone,email,employee_count,annual_revenue,status,account_manager_id,customer_since,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, [
                genCompany(),
                rand(INDUSTRIES),
                city,
                CITIES[city],
                `021${randInt(10000000, 99999999)}`,
                `info@company${i + 1}.ir`,
                randInt(10, 2000),
                randInt(5, 2000) * 100_000_000,
                rand(STATUSES),
                rand(empIds.slice(0, 12)),
                fmt(randDate(new Date('2018-01-01'), new Date('2024-01-01'))),
                rand(NOTES_CUSTOMER),
            ]);
            customerIds.push(rows[0].id);
            customerCityMap[rows[0].id] = city;
        }
        console.log(`  ✅ ${customerIds.length} customers`);
        console.log('Inserting contacts...');
        const contactIds = [];
        const contactCustomerMap = {};
        for (let i = 0; i < 800; i++) {
            const custId = rand(customerIds);
            const isPrimary = i < 500;
            const nameParts = anyName().split(' ');
            const { rows } = await client.query(`INSERT INTO crm_contacts(customer_id,first_name,last_name,position,department,email,phone,mobile,is_primary)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [
                custId, nameParts[0], nameParts[1] ?? '',
                rand(POSITIONS), rand(['مالی', 'IT', 'بازرگانی', 'مدیریت', 'خرید', 'فروش']),
                `contact${i + 1}@company${custId}.ir`,
                `021${randInt(10000000, 99999999)}`,
                `09${randInt(10, 99)}${randInt(1000000, 9999999)}`,
                isPrimary,
            ]);
            contactIds.push(rows[0].id);
            contactCustomerMap[rows[0].id] = custId;
        }
        console.log(`  ✅ ${contactIds.length} contacts`);
        console.log('Inserting leads...');
        const leadStatuses = ['جدید', 'تماس گرفته شده', 'واجد شرایط', 'غیرواجد', 'تبدیل شده'];
        for (let i = 0; i < 300; i++) {
            await client.query(`INSERT INTO crm_leads(company_name,contact_name,email,phone,source,industry,city,status,estimated_value,assigned_to,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                genCompany(), anyName(),
                `lead${i + 1}@prospect.ir`,
                `09${randInt(10, 99)}${randInt(1000000, 9999999)}`,
                rand(LEAD_SOURCES), rand(INDUSTRIES), rand(cityList),
                rand(leadStatuses),
                randInt(50, 5000) * 1_000_000,
                rand(empIds.slice(0, 12)),
                Math.random() > 0.6 ? rand(NOTES_DEAL) : null,
            ]);
        }
        console.log('  ✅ 300 leads');
        console.log('Inserting deals...');
        const dealIds = [];
        const PROBS = {
            'جستجو و کشف': 20, 'ارزیابی': 40, 'پیشنهاد': 60,
            'مذاکره': 75, 'بسته شده - موفق': 100, 'بسته شده - ناموفق': 0,
        };
        for (let i = 0; i < 400; i++) {
            const custId = rand(customerIds);
            const stage = rand(DEAL_STAGES);
            const prob = PROBS[stage] ?? 50;
            const isClosed = stage.includes('بسته شده');
            const closeDate = randDate(new Date('2023-01-01'), new Date('2025-06-01'));
            const { rows } = await client.query(`INSERT INTO crm_deals(title,customer_id,assigned_to,stage,value,probability,expected_close_date,closed_date,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, [
                `${rand(['خرید', 'تمدید قرارداد', 'ارتقاء', 'پیاده‌سازی', 'توسعه'])} ${rand(PRODUCTS).name}`,
                custId, rand(empIds.slice(0, 15)), stage,
                randInt(100, 5000) * 1_000_000,
                prob + randInt(-10, 10),
                fmt(closeDate),
                isClosed ? fmt(closeDate) : null,
                Math.random() > 0.5 ? rand(NOTES_DEAL) : null,
            ]);
            dealIds.push(rows[0].id);
        }
        console.log(`  ✅ ${dealIds.length} deals`);
        console.log('Inserting orders...');
        const orderIds = [];
        for (let i = 0; i < 600; i++) {
            const custId = rand(customerIds);
            const disc = rand([0, 0, 0, 5, 10, 15, 20]);
            const total = randInt(50, 5000) * 1_000_000;
            const final = Math.round(total * (1 - disc / 100));
            const orderDate = randDate(new Date('2022-01-01'), new Date('2025-01-01'));
            const { rows } = await client.query(`INSERT INTO crm_orders(order_number,customer_id,assigned_to,status,total_amount,discount_percent,final_amount,payment_status,order_date,delivery_date)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [
                `ORD-${String(i + 1).padStart(5, '0')}`,
                custId, rand(empIds.slice(0, 15)),
                rand(ORDER_STATUS), total, disc, final,
                rand(PAY_STATUS),
                fmtTs(orderDate),
                Math.random() > 0.3 ? fmtTs(new Date(orderDate.getTime() + randInt(7, 30) * 86400000)) : null,
            ]);
            orderIds.push(rows[0].id);
        }
        console.log(`  ✅ ${orderIds.length} orders`);
        console.log('Inserting order items...');
        let itemCount = 0;
        for (const orderId of orderIds) {
            const numItems = randInt(1, 5);
            for (let j = 0; j < numItems; j++) {
                const prod = rand(PRODUCTS);
                const qty = randInt(1, 20);
                const price = randInt(prod.minP, prod.maxP);
                const disc = rand([0, 0, 5, 10]);
                const total = Math.round(qty * price * (1 - disc / 100));
                const productId = productIds[PRODUCTS.indexOf(prod)];
                await client.query(`INSERT INTO crm_order_items(order_id,product_id,quantity,unit_price,discount_percent,total_price)
           VALUES($1,$2,$3,$4,$5,$6)`, [orderId, productId, qty, price, disc, total]);
                itemCount++;
            }
        }
        console.log(`  ✅ ${itemCount} order items`);
        console.log('Inserting activities...');
        const ACT_SUBJECTS = {
            'تماس تلفنی': ['بررسی وضعیت پروژه', 'پیگیری پیشنهاد', 'معرفی محصول جدید', 'تماس روتین', 'رفع مشکل فنی'],
            'ایمیل': ['ارسال پیشنهاد قیمت', 'ارسال کاتالوگ محصولات', 'تأیید جلسه', 'ارسال قرارداد', 'گزارش پیشرفت'],
            'جلسه حضوری': ['جلسه معارفه', 'نهایی کردن قرارداد', 'بررسی نیازمندی‌ها', 'ارائه دمو', 'جلسه بررسی سالانه'],
            'بازدید': ['بازدید از سایت مشتری', 'بررسی محیط نصب', 'ارزیابی زیرساخت'],
            'دمو محصول': ['دمو نرم‌افزار CRM', 'دمو سیستم ERP', 'آموزش کاربران'],
            'ارسال پیشنهاد': ['پیشنهاد قیمت نهایی', 'پیشنهاد تمدید قرارداد', 'پیشنهاد ارتقاء سیستم'],
        };
        for (let i = 0; i < 1200; i++) {
            const type = rand(ACT_TYPES);
            const custId = rand(customerIds);
            await client.query(`INSERT INTO crm_activities(type,subject,customer_id,employee_id,activity_date,duration_minutes,outcome,notes)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [
                type,
                rand(ACT_SUBJECTS[type] ?? ['بررسی وضعیت']),
                custId,
                rand(empIds),
                fmtTs(randDate(new Date('2022-01-01'), new Date('2025-01-01'))),
                type === 'تماس تلفنی' ? randInt(5, 45) : type === 'جلسه حضوری' ? randInt(30, 180) : null,
                rand(ACT_OUTCOMES),
                Math.random() > 0.6 ? rand(NOTES_DEAL) : null,
            ]);
        }
        console.log('  ✅ 1200 activities');
        console.log('Inserting support tickets...');
        const supportEmpIds = empIds.slice(13);
        for (let i = 0; i < 350; i++) {
            const custId = rand(customerIds);
            const status = rand(TICKET_STATUS);
            const createdAt = randDate(new Date('2022-01-01'), new Date('2025-01-01'));
            const resolvedAt = (status === 'حل شده' || status === 'بسته شده')
                ? new Date(createdAt.getTime() + randInt(1, 14) * 86400000)
                : null;
            await client.query(`INSERT INTO crm_support_tickets(ticket_number,customer_id,assigned_to,subject,description,category,priority,status,created_at,resolved_at,resolution)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
                `TKT-${String(i + 1).padStart(5, '0')}`,
                custId,
                rand([...supportEmpIds, ...empIds.slice(0, 5)]),
                rand(['مشکل فنی سیستم', 'درخواست پشتیبانی', 'خرابی تجهیزات', 'مشکل نرم‌افزاری', 'درخواست آموزش', 'اعتراض به فاکتور', 'تأخیر در تحویل']),
                rand(TICKET_DESC),
                rand(TICKET_CATS), rand(TICKET_PRIORITIES), status,
                fmtTs(createdAt),
                resolvedAt ? fmtTs(resolvedAt) : null,
                resolvedAt ? rand(['مشکل رفع شد', 'به‌روزرسانی انجام شد', 'تعویض قطعه انجام شد', 'راهنمایی کاربر انجام شد', 'برنامه‌ریزی بازدید مجدد']) : null,
            ]);
        }
        console.log('  ✅ 350 support tickets');
        console.log('Inserting campaigns...');
        for (const c of CAMPAIGNS) {
            const start = randDate(new Date('2023-01-01'), new Date('2024-06-01'));
            const end = new Date(start.getTime() + randInt(30, 90) * 86400000);
            const leads = randInt(20, 300);
            await client.query(`INSERT INTO crm_campaigns(name,type,status,start_date,end_date,budget,target_audience,description,leads_generated,conversions)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
                c.name, c.type,
                rand(['برنامه‌ریزی شده', 'فعال', 'تکمیل شده']),
                fmt(start), fmt(end),
                randInt(50, 500) * 1_000_000,
                rand(['شرکت‌های متوسط و بزرگ', 'مدیران IT', 'مدیران مالی', 'صنایع تولیدی', 'شرکت‌های خدماتی']),
                c.desc, leads,
                Math.round(leads * (0.05 + Math.random() * 0.2)),
            ]);
        }
        console.log('  ✅ 8 campaigns');
        const { rows: summary } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM crm_employees) AS employees,
        (SELECT COUNT(*) FROM crm_customers) AS customers,
        (SELECT COUNT(*) FROM crm_contacts) AS contacts,
        (SELECT COUNT(*) FROM crm_leads) AS leads,
        (SELECT COUNT(*) FROM crm_products) AS products,
        (SELECT COUNT(*) FROM crm_deals) AS deals,
        (SELECT COUNT(*) FROM crm_orders) AS orders,
        (SELECT COUNT(*) FROM crm_order_items) AS order_items,
        (SELECT COUNT(*) FROM crm_activities) AS activities,
        (SELECT COUNT(*) FROM crm_support_tickets) AS tickets,
        (SELECT COUNT(*) FROM crm_campaigns) AS campaigns
    `);
        const s = summary[0];
        const total = Object.values(s).reduce((a, b) => a + parseInt(b, 10), 0);
        console.log('\n📊 Seed summary:');
        console.table(s);
        console.log(`\n🎉 Total records: ${total}`);
    }
    finally {
        client.release();
        await pool.end();
    }
}
seed().catch((e) => { console.error('❌ Seed failed:', e.message); process.exit(1); });
//# sourceMappingURL=seed-crm.js.map