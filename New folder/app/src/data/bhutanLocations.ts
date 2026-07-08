export interface Gewog {
  id: string
  name: string
}

export interface Dzongkhag {
  id: string
  name: string
  capital: string
  region: string
  gewogs: Gewog[]
}

export const bhutanLocations: Dzongkhag[] = [
  // ===== WESTERN BHUTAN =====
  {
    id: "chukha",
    name: "Chhukha",
    capital: "Chapcha",
    region: "Western Bhutan",
    gewogs: [
      { id: "bjachho", name: "Bjachho" },
      { id: "bongo", name: "Bongo" },
      { id: "chapcha", name: "Chapcha" },
      { id: "darla", name: "Darla" },
      { id: "dungna", name: "Dungna" },
      { id: "geling", name: "Geling" },
      { id: "getana", name: "Getana" },
      { id: "lokchina", name: "Lokchina" },
      { id: "metakha", name: "Metakha" },
      { id: "phuentsholing", name: "Phuentsholing" },
      { id: "sampheling", name: "Sampheling" },
    ],
  },
  {
    id: "haa",
    name: "Haa",
    capital: "Ha",
    region: "Western Bhutan",
    gewogs: [
      { id: "bji", name: "Bji" },
      { id: "gakiling", name: "Gakiling" },
      { id: "katsho", name: "Katsho" },
      { id: "samar", name: "Samar" },
      { id: "sangbay", name: "Sangbay" },
      { id: "uesu", name: "Uesu" },
    ],
  },
  {
    id: "paro",
    name: "Paro",
    capital: "Paro",
    region: "Western Bhutan",
    gewogs: [
      { id: "dogar", name: "Dogar" },
      { id: "dopshari", name: "Dopshari" },
      { id: "doteng", name: "Doteng" },
      { id: "hungrel", name: "Hungrel" },
      { id: "lamgong", name: "Lamgong" },
      { id: "lungnyi", name: "Lungnyi" },
      { id: "naja", name: "Naja" },
      { id: "shapa", name: "Shapa" },
      { id: "tsento", name: "Tsento" },
      { id: "wangchang", name: "Wangchang" },
    ],
  },
  {
    id: "samtse",
    name: "Samtse",
    capital: "Samtse",
    region: "Western Bhutan",
    gewogs: [
      { id: "denchukha", name: "Denchukha" },
      { id: "dorokha", name: "Dorokha" },
      { id: "dungtoe", name: "Dungtoe" },
      { id: "namgaychhoeling", name: "Namgaychhoeling" },
      { id: "norbugang", name: "Norbugang" },
      { id: "norgaygang", name: "Norgaygang" },
      { id: "pemaling", name: "Pemaling" },
      { id: "phuentshogpelri", name: "Phuentshogpelri" },
      { id: "samtse", name: "Samtse" },
      { id: "sangngagchhoeling", name: "Sangngagchhoeling" },
      { id: "tading", name: "Tading" },
      { id: "tashicholing", name: "Tashicholing" },
      { id: "tendruk", name: "Tendruk" },
      { id: "ugentse", name: "Ugentse" },
      { id: "yoeseltse", name: "Yoeseltse" },
    ],
  },
  {
    id: "thimphu",
    name: "Thimphu",
    capital: "Thimphu",
    region: "Western Bhutan",
    gewogs: [
      { id: "chang", name: "Chang" },
      { id: "dagala", name: "Dagala" },
      { id: "genye", name: "Genye" },
      { id: "kawang", name: "Kawang" },
      { id: "lingzhi", name: "Lingzhi" },
      { id: "mewang", name: "Mewang" },
      { id: "naro", name: "Naro" },
      { id: "soe", name: "Soe" },
    ],
  },

  // ===== CENTRAL BHUTAN =====
  {
    id: "dagana",
    name: "Dagana",
    capital: "Daga",
    region: "Central Bhutan",
    gewogs: [
      { id: "dorona", name: "Dorona" },
      { id: "drujegang", name: "Drujegang" },
      { id: "gesarling", name: "Gesarling" },
      { id: "goshi", name: "Goshi" },
      { id: "kana", name: "Kana" },
      { id: "karmaling", name: "Karmaling" },
      { id: "khebisa", name: "Khebisa" },
      { id: "lajab", name: "Lajab" },
      { id: "lhamoi-zingkha", name: "Lhamoi Zingkha" },
      { id: "nichula", name: "Nichula" },
      { id: "tashiding", name: "Tashiding" },
      { id: "tsangkha", name: "Tsangkha" },
      { id: "tsendagang", name: "Tsendagang" },
      { id: "tseza", name: "Tseza" },
    ],
  },
  {
    id: "gasa",
    name: "Gasa",
    capital: "Gasa Dzong",
    region: "Central Bhutan",
    gewogs: [
      { id: "khamaed", name: "Khamaed" },
      { id: "khatoe", name: "Khatoe" },
      { id: "laya", name: "Laya" },
      { id: "lunana", name: "Lunana" },
    ],
  },
  {
    id: "punakha",
    name: "Punakha",
    capital: "Punakha",
    region: "Central Bhutan",
    gewogs: [
      { id: "barp", name: "Barp" },
      { id: "chhubug", name: "Chhubug" },
      { id: "dzomi", name: "Dzomi" },
      { id: "goenshari", name: "Goenshari" },
      { id: "guma", name: "Guma" },
      { id: "kabjisa", name: "Kabjisa" },
      { id: "lingmukha", name: "Lingmukha" },
      { id: "shenga-bjemi", name: "Shenga Bjemi" },
      { id: "talog", name: "Talog" },
      { id: "toepisa", name: "Toepisa" },
      { id: "toewang", name: "Toewang" },
    ],
  },
  {
    id: "tsirang",
    name: "Tsirang",
    capital: "Damphu",
    region: "Central Bhutan",
    gewogs: [
      { id: "barshong", name: "Barshong" },
      { id: "dunglagang", name: "Dunglagang" },
      { id: "gosarling", name: "Gosarling" },
      { id: "kilkhorthang", name: "Kilkhorthang" },
      { id: "mendrelgang", name: "Mendrelgang" },
      { id: "patshaling", name: "Patshaling" },
      { id: "phuentenchhu", name: "Phuentenchhu" },
      { id: "rangthangling", name: "Rangthangling" },
      { id: "semjong", name: "Semjong" },
      { id: "sergithang", name: "Sergithang" },
      { id: "tsholingkhar", name: "Tsholingkhar" },
      { id: "tsirangtoe", name: "Tsirangtoe" },
    ],
  },
  {
    id: "wangdue-phodrang",
    name: "Wangdue Phodrang",
    capital: "Wangdue",
    region: "Central Bhutan",
    gewogs: [
      { id: "athang", name: "Athang" },
      { id: "bjena", name: "Bjena" },
      { id: "daga", name: "Daga" },
      { id: "dangchu", name: "Dangchu" },
      { id: "gangte", name: "Gangte" },
      { id: "gasetsho-gom", name: "Gasetsho Gom" },
      { id: "gasetsho-om", name: "Gasetsho Om" },
      { id: "kazhi", name: "Kazhi" },
      { id: "nahi", name: "Nahi" },
      { id: "nyisho", name: "Nyisho" },
      { id: "phangyuel", name: "Phangyuel" },
      { id: "phobji", name: "Phobji" },
      { id: "ruepisa", name: "Ruepisa" },
      { id: "sephu", name: "Sephu" },
      { id: "thedtsho", name: "Thedtsho" },
    ],
  },

  // ===== SOUTHERN BHUTAN =====
  {
    id: "bumthang",
    name: "Bumthang",
    capital: "Jakar",
    region: "Southern Bhutan",
    gewogs: [
      { id: "chhoekhor", name: "Chhoekhor" },
      { id: "chhume", name: "Chhume" },
      { id: "tang", name: "Tang" },
      { id: "ura", name: "Ura" },
    ],
  },
  {
    id: "sarpang",
    name: "Sarpang",
    capital: "Sarpang",
    region: "Southern Bhutan",
    gewogs: [
      { id: "bhur", name: "Bhur" },
      { id: "chhuzagang", name: "Chhuzagang" },
      { id: "dekiling", name: "Dekiling" },
      { id: "gakiling", name: "Gakiling" },
      { id: "gelephu", name: "Gelephu" },
      { id: "jigmechhoeling", name: "Jigmechhoeling" },
      { id: "samtenling", name: "Samtenling" },
      { id: "senghe", name: "Senghe" },
      { id: "serzhong", name: "Serzhong" },
      { id: "shompangkha", name: "Shompangkha" },
      { id: "tareythang", name: "Tareythang" },
      { id: "umling", name: "Umling" },
    ],
  },
  {
    id: "trongsa",
    name: "Trongsa",
    capital: "Trongsa",
    region: "Southern Bhutan",
    gewogs: [
      { id: "dragteng", name: "Dragteng" },
      { id: "korphu", name: "Korphu" },
      { id: "langthil", name: "Langthil" },
      { id: "nubi", name: "Nubi" },
      { id: "tangsibji", name: "Tangsibji" },
    ],
  },
  {
    id: "zhemgang",
    name: "Zhemgang",
    capital: "Zhemgang",
    region: "Southern Bhutan",
    gewogs: [
      { id: "bardo", name: "Bardo" },
      { id: "bjoka", name: "Bjoka" },
      { id: "goshing", name: "Goshing" },
      { id: "nangkor", name: "Nangkor" },
      { id: "ngangla", name: "Ngangla" },
      { id: "phangkhar", name: "Phangkhar" },
      { id: "shingkhar", name: "Shingkhar" },
      { id: "trong", name: "Trong" },
    ],
  },

  // ===== EASTERN BHUTAN =====
  {
    id: "lhuentse",
    name: "Lhuentse",
    capital: "Lhuentse",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "gangzur", name: "Gangzur" },
      { id: "jarey", name: "Jarey" },
      { id: "khoma", name: "Khoma" },
      { id: "kurtoed", name: "Kurtoed" },
      { id: "menbi", name: "Menbi" },
      { id: "metsho", name: "Metsho" },
      { id: "minjay", name: "Minjay" },
      { id: "tsenkhar", name: "Tsenkhar" },
    ],
  },
  {
    id: "mongar",
    name: "Mongar",
    capital: "Mongar",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "balam", name: "Balam" },
      { id: "chali", name: "Chali" },
      { id: "chaskhar", name: "Chaskhar" },
      { id: "drametse", name: "Drametse" },
      { id: "drepong", name: "Drepong" },
      { id: "gongdue", name: "Gongdue" },
      { id: "jurmey", name: "Jurmey" },
      { id: "kengkhar", name: "Kengkhar" },
      { id: "mongar", name: "Mongar" },
      { id: "narang", name: "Narang" },
      { id: "ngatshang", name: "Ngatshang" },
      { id: "saling", name: "Saling" },
      { id: "shermuhoong", name: "Shermuhoong" },
      { id: "silambi", name: "Silambi" },
      { id: "thangrong", name: "Thangrong" },
      { id: "tsakaling", name: "Tsakaling" },
      { id: "tsamang", name: "Tsamang" },
    ],
  },
  {
    id: "pemagatshel",
    name: "Pema Gatshel",
    capital: "Pema Gatshel",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "chimoong", name: "Chimoong" },
      { id: "choekhorling", name: "Choekhorling" },
      { id: "chongshing", name: "Chongshing" },
      { id: "dechenling", name: "Dechenling" },
      { id: "dungmaed", name: "Dungmaed" },
      { id: "khar", name: "Khar" },
      { id: "nanong", name: "Nanong" },
      { id: "norbugang", name: "Norbugang" },
      { id: "shumar", name: "Shumar" },
      { id: "yurung", name: "Yurung" },
      { id: "zobel", name: "Zobel" },
    ],
  },
  {
    id: "samdrup-jongkhar",
    name: "Samdrup Jongkhar",
    capital: "Samdrup Jongkhar",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "dewathang", name: "Dewathang" },
      { id: "gomdar", name: "Gomdar" },
      { id: "langchenphu", name: "Langchenphu" },
      { id: "lauri", name: "Lauri" },
      { id: "martshala", name: "Martshala" },
      { id: "orong", name: "Orong" },
      { id: "pemathang", name: "Pemathang" },
      { id: "phuntshothang", name: "Phuntshothang" },
      { id: "samrang", name: "Samrang" },
      { id: "serthi", name: "Serthi" },
      { id: "wangphu", name: "Wangphu" },
    ],
  },
  {
    id: "trashigang",
    name: "Trashigang",
    capital: "Trashigang",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "bartsham", name: "Bartsham" },
      { id: "bidung", name: "Bidung" },
      { id: "kanglung", name: "Kanglung" },
      { id: "kangpar", name: "Kangpar" },
      { id: "khaling", name: "Khaling" },
      { id: "lumang", name: "Lumang" },
      { id: "merag", name: "Merag" },
      { id: "phongmed", name: "Phongmed" },
      { id: "radi", name: "Radi" },
      { id: "sakteng", name: "Sakteng" },
      { id: "samkhar", name: "Samkhar" },
      { id: "shongphoog", name: "Shongphoog" },
      { id: "thrimshing", name: "Thrimshing" },
      { id: "uzorong", name: "Uzorong" },
      { id: "yangnyer", name: "Yangnyer" },
    ],
  },
  {
    id: "trashiyangtse",
    name: "Trashiyangtse",
    capital: "Trashiyangtse",
    region: "Eastern Bhutan",
    gewogs: [
      { id: "bumdeling", name: "Bumdeling" },
      { id: "jamkhar", name: "Jamkhar" },
      { id: "khamdang", name: "Khamdang" },
      { id: "ramjar", name: "Ramjar" },
      { id: "toetsho", name: "Toetsho" },
      { id: "tomzhangsa", name: "Tomzhangsa" },
      { id: "yalang", name: "Yalang" },
      { id: "yangtse", name: "Yangtse" },
    ],
  },
]

export function getDzongkhagById(id: string): Dzongkhag | undefined {
  return bhutanLocations.find((d) => d.id === id)
}

export function getGewogsByDzongkhagId(dzongkhagId: string): Gewog[] {
  const dzongkhag = bhutanLocations.find((d) => d.id === dzongkhagId)
  return dzongkhag?.gewogs || []
}

export function getAllDzongkhags(): Dzongkhag[] {
  return bhutanLocations
}

export function getDzongkhagsByRegion(region: string): Dzongkhag[] {
  return bhutanLocations.filter((d) => d.region === region)
}

export function getAllRegions(): string[] {
  return ["Western Bhutan", "Central Bhutan", "Southern Bhutan", "Eastern Bhutan"]
}

export function formatAddress(fields: {
  street?: string
  gewog?: string
  dzongkhag?: string
}): string {
  const parts = [fields.street, fields.gewog, fields.dzongkhag, "Bhutan"].filter(Boolean)
  return parts.join(", ")
}
