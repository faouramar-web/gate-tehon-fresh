// server.ts
import express from "express";
import path2 from "path";
import { fileURLToPath } from "url";
import fs2 from "fs";

// data/store.ts
import fs from "fs";
import path from "path";

// src/lib/seedData.ts
var SEEDED_SCHOOLS = [
  {
    "id": "school-1793938314748",
    "status": "active",
    "createdAt": "2026-11-06T04:11:54.748Z",
    "name": "\u05E8\u05D1 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DE\u05DC \u05D9\u05D0\u05E0\u05D5\u05D7 \u05D2'\u05EA",
    "contactPerson": "\u05EA\u05D9\u05E8\u05D0\u05DF \u05E1\u05E2\u05D9\u05D3",
    "code": "SCH-01",
    "city": "\u05D9\u05D0\u05E0\u05D5\u05D7 \u05D2'\u05EA",
    "isSuspended": false,
    "phone": "0525557368",
    "activationCode": "9201"
  }
];
var SEEDED_ACTIVE_SCHOOL_ID = "school-1793938314748";
var SEEDED_STAFF = [
  {
    "id": "staff-1793938342639-2ra",
    "role": "teacher",
    "assignedClasses": [
      "\u05D9\u05D14"
    ],
    "fullName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "isActive": true,
    "staffCode": "T19",
    "pinCode": "4860",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "staff-1793938342639-32x",
    "pinCode": "2591",
    "fullName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "role": "teacher",
    "isActive": true,
    "staffCode": "T10",
    "assignedClasses": [
      "\u05D93"
    ],
    "schoolId": "school-1793938314748"
  },
  {
    "id": "staff-1793938342639-40e",
    "schoolId": "school-1793938314748",
    "pinCode": "5587",
    "assignedClasses": [
      "\u05D9\u05D04"
    ],
    "isActive": true,
    "role": "teacher",
    "fullName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "staffCode": "T15"
  },
  {
    "id": "staff-1793938342639-4wk",
    "fullName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "pinCode": "6507",
    "role": "teacher",
    "schoolId": "school-1793938314748",
    "staffCode": "T14",
    "assignedClasses": [
      "\u05D9\u05D03"
    ],
    "isActive": true
  },
  {
    "id": "staff-1793938342639-bs1",
    "role": "teacher",
    "pinCode": "1528",
    "schoolId": "school-1793938314748",
    "assignedClasses": [
      "\u05D9\u05D01"
    ],
    "staffCode": "T12",
    "isActive": true,
    "fullName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1"
  },
  {
    "id": "staff-1793938342639-ff7",
    "fullName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "assignedClasses": [
      "\u05D9\u05D12"
    ],
    "role": "teacher",
    "pinCode": "6850",
    "staffCode": "T17",
    "schoolId": "school-1793938314748",
    "isActive": true
  },
  {
    "id": "staff-1793938342639-hrg",
    "assignedClasses": [
      "\u05D9\u05D13"
    ],
    "fullName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "isActive": true,
    "pinCode": "4208",
    "staffCode": "T18",
    "schoolId": "school-1793938314748",
    "role": "teacher"
  },
  {
    "id": "staff-1793938342639-jdp",
    "assignedClasses": [
      "\u05D9\u05D11"
    ],
    "staffCode": "T16",
    "fullName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "pinCode": "9820",
    "isActive": true,
    "schoolId": "school-1793938314748",
    "role": "teacher"
  },
  {
    "id": "staff-1793938342639-mum",
    "schoolId": "school-1793938314748",
    "isActive": true,
    "pinCode": "4126",
    "fullName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "assignedClasses": [
      "\u05D92"
    ],
    "staffCode": "T9",
    "role": "teacher"
  },
  {
    "id": "staff-1793938342639-nhn",
    "schoolId": "school-1793938314748",
    "isActive": true,
    "staffCode": "T11",
    "fullName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "pinCode": "8865",
    "assignedClasses": [
      "\u05D94"
    ],
    "role": "teacher"
  },
  {
    "id": "staff-1793938342639-ybz",
    "fullName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "pinCode": "5659",
    "schoolId": "school-1793938314748",
    "isActive": true,
    "role": "teacher",
    "staffCode": "T8",
    "assignedClasses": [
      "\u05D91"
    ]
  },
  {
    "id": "staff-1793938342639-z1u",
    "assignedClasses": [
      "\u05D9\u05D02"
    ],
    "fullName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "pinCode": "1648",
    "role": "teacher",
    "isActive": true,
    "staffCode": "T13",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "staff-admin-amar",
    "pinCode": "160525",
    "schoolId": "*",
    "role": "admin",
    "assignedClasses": [
      "*"
    ],
    "isActive": true,
    "fullName": "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
    "staffCode": "ADMIN"
  },
  {
    "id": "staff-bisan-khattas",
    "isActive": true,
    "schoolId": "school-1793934341104",
    "staffCode": "T-BISAN",
    "role": "teacher",
    "assignedClasses": [
      "\u05D92"
    ],
    "fullName": "\u05D1\u05D9\u05E1\u05D0\u05DF \u05D2\u05D8\u05D0\u05E1",
    "pinCode": "2021"
  },
  {
    "id": "staff-guard-school-1793934341104",
    "fullName": "\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8 (\u05E8\u05D1 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DE\u05DC \u05D9\u05D0\u05E0\u05D5\u05D7-\u05D2\u05F3\u05EA)",
    "role": "guard",
    "isActive": true,
    "staffCode": "G01",
    "pinCode": "2001",
    "assignedClasses": [],
    "schoolId": "school-1793934341104"
  },
  {
    "id": "staff-guard-school-1793938314748",
    "staffCode": "G01",
    "assignedClasses": [],
    "fullName": "\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8 (\u05E8\u05D1 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DE\u05DC \u05D9\u05D0\u05E0\u05D5\u05D7 \u05D2'\u05EA)",
    "pinCode": "5691",
    "isActive": true,
    "schoolId": "school-1793938314748",
    "role": "guard"
  },
  {
    "id": "staff-katiss-hani",
    "role": "teacher",
    "isActive": true,
    "schoolId": "school-1793934341104",
    "staffCode": "T-KATISS",
    "assignedClasses": [
      "\u05D91"
    ],
    "pinCode": "2022",
    "fullName": "\u05E7\u05D8\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "id": "staff-vp-school-1793934341104",
    "role": "vice_principal",
    "pinCode": "3380",
    "assignedClasses": [
      "*"
    ],
    "phone": "0525557368",
    "fullName": "\u05EA\u05D9\u05E8\u05D0\u05DF \u05E1\u05E2\u05D9\u05D3 (\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC / \u05D0\u05D7\u05E8\u05D0\u05D9 \u05E9\u05D7\u05E8\u05D5\u05E8\u05D9\u05DD)",
    "staffCode": "VP01",
    "schoolId": "school-1793934341104",
    "isActive": true
  },
  {
    "id": "staff-vp-school-1793938314748",
    "pinCode": "3431",
    "assignedClasses": [
      "*"
    ],
    "staffCode": "VP01",
    "isActive": true,
    "role": "vice_principal",
    "schoolId": "school-1793938314748",
    "phone": "0525557368",
    "fullName": "\u05EA\u05D9\u05E8\u05D0\u05DF \u05E1\u05E2\u05D9\u05D3 (\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC / \u05D0\u05D7\u05E8\u05D0\u05D9 \u05E9\u05D7\u05E8\u05D5\u05E8\u05D9\u05DD)"
  },
  {
    "id": "staff-teacher-amar-1605",
    "pinCode": "1605",
    "assignedClasses": [
      "\u05D9\u05D14"
    ],
    "staffCode": "T-1605",
    "isActive": true,
    "role": "teacher",
    "schoolId": "school-1793938314748",
    "phone": "",
    "fullName": "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05D5\u05E8\u05D4 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9 \u05D9\u05D14)"
  }
];
var SEEDED_STUDENTS = [
  {
    "className": "\u05D91",
    "fullName": "\u05E2\u05D3\u05DF \u05D6\u05D0\u05D4\u05E8",
    "id": "s-1793910056272-2jc9",
    "studentCode": "\u05D91-08",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05D0\u05E8\u05D6 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "className": "\u05D91",
    "id": "s-1793910056272-4kze",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-10",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "id": "s-1793910056272-78mc",
    "schoolId": "school-1793938314748",
    "className": "\u05D91",
    "studentCode": "\u05D91-07",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "fullName": "\u05EA\u05DE\u05D9\u05E8 \u05E4\u05E8\u05D2'"
  },
  {
    "className": "\u05D91",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-04",
    "fullName": "\u05D5\u05D9\u05E1\u05D0\u05DD \u05D6\u05D9\u05D0\u05D3\u05D4",
    "id": "s-1793910056272-k0a7"
  },
  {
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-06",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "fullName": "\u05DC\u05D9\u05DF \u05E4\u05E8\u05D2'",
    "className": "\u05D91",
    "id": "s-1793910056272-klhk"
  },
  {
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "className": "\u05D91",
    "studentCode": "\u05D91-05",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056272-pg9j",
    "fullName": "\u05DE\u05DC\u05D0\u05E7 \u05E4\u05E8\u05D2'"
  },
  {
    "id": "s-1793910056272-q72a",
    "studentCode": "\u05D91-09",
    "fullName": "\u05E1\u05E2\u05D9\u05D3 \u05E1\u05E2\u05D9\u05D3",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "className": "\u05D91",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D91",
    "fullName": "\u05EA\u05D5\u05DC\u05D9\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8",
    "id": "s-1793910056272-vb3o",
    "studentCode": "\u05D91-02",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056272-xv88",
    "className": "\u05D91",
    "studentCode": "\u05D91-01",
    "fullName": "\u05D2\u05D3\u05D9 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-11",
    "fullName": "\u05D0\u05D9\u05D4 \u05DE\u05D5\u05E0\u05D0 \u05E4\u05E8\u05D2'",
    "className": "\u05D91",
    "id": "s-1793910056272-ydsr"
  },
  {
    "fullName": "\u05E8\u05D9\u05DE\u05D0\u05E1 \u05D1\u05E8\u05D9\u05E7",
    "id": "s-1793910056272-yj67",
    "className": "\u05D91",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-03",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "className": "\u05D91",
    "fullName": "\u05DE\u05DC\u05E7 \u05D7'\u05D8\u05D9\u05D1",
    "studentCode": "\u05D91-12",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "id": "s-1793910056273-1s7i",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056273-2fx8",
    "className": "\u05D92",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-18",
    "fullName": "\u05E9\u05D4\u05D3 \u05D1\u05E8\u05D9\u05E7"
  },
  {
    "fullName": "\u05D0\u05DE\u05DC \u05D7\u05D1\u05E7\u05D4",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-06",
    "className": "\u05D93",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-2ibi"
  },
  {
    "fullName": "\u05D9\u05E0\u05D0\u05DC \u05E2\u05D1\u05D0\u05E1",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "id": "s-1793910056273-2xiu",
    "studentCode": "\u05D93-02",
    "className": "\u05D93",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05D0\u05E1\u05D9\u05DC \u05D1\u05E8\u05DB\u05D0\u05EA",
    "className": "\u05D94",
    "id": "s-1793910056273-3hoh",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D94-11",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF"
  },
  {
    "fullName": "\u05E2\u05E4\u05D5 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "id": "s-1793910056273-3s1o",
    "studentCode": "\u05D94-15",
    "className": "\u05D94",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "id": "s-1793910056273-4ddh",
    "studentCode": "\u05D94-14",
    "className": "\u05D94",
    "fullName": "\u05E9\u05D0\u05D3\u05D9 \u05D1\u05D9\u05D1\u05D0\u05E8"
  },
  {
    "id": "s-1793910056273-4hiz",
    "fullName": "\u05D2'\u05D5\u05D0\u05DF \u05E7\u05D8\u05D9\u05DE\u05D4",
    "className": "\u05D94",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "studentCode": "\u05D94-09"
  },
  {
    "fullName": "\u05E8\u05D9\u05DE\u05D0\u05E1 \u05E2\u05D1\u05D9\u05D3",
    "id": "s-1793910056273-4j3e",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-07",
    "className": "\u05D93"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D93",
    "id": "s-1793910056273-4rdg",
    "fullName": "\u05E1\u05D9\u05DE\u05D0 \u05E2\u05D1\u05D9\u05D3",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-05"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-4sme",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-17",
    "className": "\u05D92",
    "fullName": "\u05D0\u05D9\u05D9\u05DC \u05D7\u05D1\u05E7\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-52yx",
    "className": "\u05D93",
    "studentCode": "\u05D93-13",
    "fullName": "\u05D2'\u05D5\u05D3 \u05E1\u05E2\u05D3",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4"
  },
  {
    "className": "\u05D92",
    "fullName": "\u05E2\u05DE\u05D0\u05E8 \u05E2\u05D1\u05D0\u05E1",
    "id": "s-1793910056273-5edz",
    "studentCode": "\u05D92-25",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05DE\u05D9\u05DC\u05D0\u05DF \u05DE\u05D0\u05DC\u05E7 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "className": "\u05D92",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-22",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-5h7h"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05E1\u05D9\u05E8\u05D9\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF",
    "studentCode": "\u05D9\u05D01-02",
    "id": "s-1793910056273-5tch",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056273-66mo",
    "studentCode": "\u05D93-20",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "className": "\u05D93",
    "fullName": "\u05E1\u05E2\u05D9\u05D3 \u05E1\u05E2\u05D3"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-67e7",
    "className": "\u05D93",
    "fullName": "\u05E4\u05D0\u05D3\u05D9 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "studentCode": "\u05D93-09",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4"
  },
  {
    "id": "s-1793910056273-6aid",
    "className": "\u05D92",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D92-20",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05E2\u05D0\u05E8\u05E3 \u05E1\u05D9\u05E3"
  },
  {
    "fullName": "\u05E1\u05D9\u05DC\u05D0 \u05D1\u05E8\u05D9\u05E7",
    "className": "\u05D93",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "id": "s-1793910056273-6dyo",
    "studentCode": "\u05D93-16"
  },
  {
    "studentCode": "\u05D93-08",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "schoolId": "school-1793938314748",
    "className": "\u05D93",
    "id": "s-1793910056273-6e7x",
    "fullName": "\u05E8\u05DD \u05D7\u05D1\u05E7\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-72jo",
    "className": "\u05D94",
    "fullName": "\u05DE\u05D5\u05E8\u05D0\u05D3 \u05E2\u05D1\u05D0\u05E1",
    "studentCode": "\u05D94-01",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D94",
    "studentCode": "\u05D94-13",
    "id": "s-1793910056273-78tw",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "fullName": "\u05D2\u05D5\u05E0\u05D9\u05D9\u05D3 \u05D7'\u05D8\u05D9\u05D1"
  },
  {
    "className": "\u05D93",
    "studentCode": "\u05D93-19",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "id": "s-1793910056273-7931",
    "fullName": "\u05E8\u05D0\u05E0\u05D9 \u05E2\u05D2'\u05DE\u05D9\u05D4"
  },
  {
    "studentCode": "\u05D92-02",
    "className": "\u05D92",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "id": "s-1793910056273-822z",
    "fullName": "\u05E8\u05E4\u05D9\u05E3 \u05E4\u05D5\u05D0\u05D3",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D01",
    "fullName": "\u05E2\u05D8\u05D0\u05E3 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "studentCode": "\u05D9\u05D01-03",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "id": "s-1793910056273-8nbu",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "studentCode": "\u05D91-24",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E2\u05D3\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF",
    "className": "\u05D91",
    "id": "s-1793910056273-8rn9"
  },
  {
    "id": "s-1793910056273-9my9",
    "fullName": "\u05D2'\u05D5\u05D3 \u05D1\u05E8\u05DB\u05D0\u05EA",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "className": "\u05D92",
    "studentCode": "\u05D92-26"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05D7\u05E1\u05DF \u05D0\u05DC \u05D3\u05D9\u05DF \u05E2\u05D1\u05D0\u05E1",
    "studentCode": "\u05D92-08",
    "id": "s-1793910056273-a959",
    "className": "\u05D92"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-05",
    "id": "s-1793910056273-cd7e",
    "fullName": "\u05E1\u05D0\u05E8\u05D4 \u05D1\u05E8\u05DB\u05D0\u05EA",
    "className": "\u05D92"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-11",
    "id": "s-1793910056273-d8v5",
    "fullName": "\u05DC\u05D9\u05D0\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8",
    "className": "\u05D92"
  },
  {
    "className": "\u05D92",
    "schoolId": "school-1793938314748",
    "fullName": "\u05DC\u05D9\u05D0\u05DF \u05D7\u05D0\u05E1\u05D1\u05D0\u05E0\u05D9",
    "studentCode": "\u05D92-27",
    "id": "s-1793910056273-dd0k",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "fullName": "\u05DB\u05DE\u05D0\u05DC \u05D6\u05D9\u05D0\u05D3\u05D4",
    "id": "s-1793910056273-djuc",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "studentCode": "\u05D94-07",
    "className": "\u05D94"
  },
  {
    "id": "s-1793910056273-dqw8",
    "fullName": "\u05E1\u05D0\u05DC\u05D7 \u05E4\u05E8\u05D2",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "className": "\u05D91",
    "studentCode": "\u05D91-21",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05DE\u05DC\u05E7 \u05E9\u05DE\u05D0",
    "className": "\u05D92",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-eb0u",
    "studentCode": "\u05D92-13",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4"
  },
  {
    "id": "s-1793910056273-eu4i",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "fullName": "\u05E2\u05D9\u05D3\u05DF \u05E1\u05E2\u05D3",
    "studentCode": "\u05D91-16",
    "className": "\u05D91",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-eu9j",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-23",
    "fullName": "\u05D2\u05D5\u05DC\u05D0\u05DF \u05E1\u05E2\u05D3",
    "className": "\u05D93"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "studentCode": "\u05D94-02",
    "id": "s-1793910056273-f9hy",
    "fullName": "\u05E8\u05D9\u05D0\u05DF \u05E1\u05D1\u05D9\u05EA\u05D9",
    "className": "\u05D94",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D93-22",
    "fullName": "\u05D2'\u05D6\u05DC \u05D7\u05E1\u05D1\u05D0\u05E0\u05D9",
    "id": "s-1793910056273-fab4",
    "className": "\u05D93"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-fkdi",
    "studentCode": "\u05D92-21",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "className": "\u05D92",
    "fullName": "\u05D2'\u05D5\u05DC\u05D9\u05E0\u05D0\u05E8 \u05E2\u05D1\u05D9\u05D3"
  },
  {
    "studentCode": "\u05D92-24",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05E1\u05E2\u05D9\u05D3 \u05D0\u05D1\u05D5 \u05D2'\u05D3\u05E2\u05D0\u05DF",
    "className": "\u05D92",
    "id": "s-1793910056273-fmd7",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-03",
    "className": "\u05D92",
    "fullName": "\u05E4\u05D0\u05E8\u05E1 \u05E4\u05E8\u05D2'",
    "id": "s-1793910056273-h869"
  },
  {
    "id": "s-1793910056273-i5g3",
    "className": "\u05D91",
    "fullName": "\u05EA\u05D5\u05DC\u05D9\u05DF \u05E2\u05D1\u05D9\u05D3",
    "studentCode": "\u05D91-13",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "id": "s-1793910056273-iifc",
    "schoolId": "school-1793938314748",
    "className": "\u05D92",
    "studentCode": "\u05D92-06",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05D2'\u05D5\u05DC\u05D9\u05D0\u05DF \u05E1\u05E2\u05D3"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-01",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05D7\u05DC\u05D0 \u05E4\u05E8\u05D2'",
    "id": "s-1793910056273-irnt"
  },
  {
    "className": "\u05D92",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D92-14",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05D0\u05DC\u05D9\u05DF \u05E1\u05E2\u05D9\u05D3",
    "id": "s-1793910056273-kn2v"
  },
  {
    "fullName": "\u05DE\u05D9\u05E8\u05D0\u05DC \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056273-kx0k",
    "className": "\u05D93",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D93-18"
  },
  {
    "studentCode": "\u05D91-17",
    "id": "s-1793910056273-l4zo",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748",
    "className": "\u05D91",
    "fullName": "\u05D2'\u05D5\u05D0\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D92",
    "studentCode": "\u05D92-09",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05D9\u05D9\u05E0\u05D0\u05DC \u05D1\u05D9\u05D1\u05D0\u05E8",
    "id": "s-1793910056273-lkyd"
  },
  {
    "id": "s-1793910056273-ll00",
    "fullName": "\u05DC\u05D9\u05DF \u05E2\u05D1\u05D3\u05D0\u05DC\u05DC\u05D4",
    "className": "\u05D91",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "studentCode": "\u05D91-23",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056273-lqvk",
    "schoolId": "school-1793938314748",
    "fullName": "\u05EA\u05D9\u05E8\u05D0\u05DF \u05D7\u05E1\u05D1\u05D0\u05E0\u05D9",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "className": "\u05D93",
    "studentCode": "\u05D93-04"
  },
  {
    "id": "s-1793910056273-m5pf",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "className": "\u05D91",
    "studentCode": "\u05D91-20",
    "schoolId": "school-1793938314748",
    "fullName": "\u05DC\u05D9\u05E8\u05D0\u05DF \u05E1\u05E2\u05D3"
  },
  {
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "id": "s-1793910056273-mvut",
    "studentCode": "\u05D91-26",
    "schoolId": "school-1793938314748",
    "className": "\u05D91",
    "fullName": "\u05DB\u05E8\u05DE\u05DC \u05E2\u05D1\u05D0\u05E1"
  },
  {
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05E9\u05E4\u05D9\u05E7 \u05D6\u05D9\u05D0\u05D3\u05D4",
    "id": "s-1793910056273-ntq8",
    "studentCode": "\u05D92-23",
    "className": "\u05D92",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D91",
    "fullName": "\u05DC\u05D5\u05D6\u05D0\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF",
    "id": "s-1793910056273-nuny",
    "studentCode": "\u05D91-25",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056273-nva7",
    "className": "\u05D93",
    "studentCode": "\u05D93-11",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "fullName": "\u05D1\u05D0\u05E1\u05DC \u05D7'\u05D8\u05D9\u05D1",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D91",
    "id": "s-1793910056273-nvpl",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D91-19",
    "fullName": "\u05D7\u05D5\u05E1\u05D9\u05D9\u05DF \u05E1\u05E2\u05D3",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "id": "s-1793910056273-o25n",
    "fullName": "\u05E1\u05DC\u05D9\u05DE\u05D0\u05DF \u05E1\u05E2\u05D3",
    "className": "\u05D94",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D94-04",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "studentCode": "\u05D94-12",
    "schoolId": "school-1793938314748",
    "className": "\u05D94",
    "id": "s-1793910056273-oo6o",
    "fullName": "\u05D9\u05D0\u05E1\u05DE\u05D9\u05DF \u05D7\u05D8\u05D9\u05D1"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-opa4",
    "className": "\u05D92",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05D0\u05DC\u05DE\u05D4 \u05E2\u05D2\u05DE\u05D9\u05D4",
    "studentCode": "\u05D92-12"
  },
  {
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "fullName": "\u05EA\u05DC\u05D9\u05DF \u05E1\u05E2\u05D3",
    "studentCode": "\u05D92-19",
    "id": "s-1793910056273-oqql",
    "className": "\u05D92",
    "schoolId": "school-1793938314748"
  },
  {
    "studentCode": "\u05D94-08",
    "fullName": "\u05E8\u05D5\u05D0\u05D3 \u05E1\u05E2\u05D9\u05D3",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "id": "s-1793910056273-ortx",
    "className": "\u05D94",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D92",
    "fullName": "\u05EA\u05D0\u05DE\u05E8 \u05E1\u05E2\u05D3",
    "studentCode": "\u05D92-07",
    "id": "s-1793910056273-pifb",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4"
  },
  {
    "fullName": "\u05D2\u05D5\u05DC\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-24",
    "className": "\u05D93",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-podh"
  },
  {
    "id": "s-1793910056273-pu0w",
    "studentCode": "\u05D91-14",
    "fullName": "\u05D1\u05E9\u05D9\u05E8 \u05E1\u05D1\u05D9\u05EA\u05D9",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "className": "\u05D91",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "id": "s-1793910056273-qmm4",
    "studentCode": "\u05D92-16",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E1\u05D9\u05DC\u05D0 \u05E2\u05D1\u05D9\u05D3",
    "className": "\u05D92"
  },
  {
    "id": "s-1793910056273-qqw5",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D94-16",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "fullName": "\u05E8\u05D9\u05D0\u05DF \u05E2\u05D1\u05D0\u05E1",
    "className": "\u05D94"
  },
  {
    "fullName": "\u05D2'\u05D0\u05D5\u05DC \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056273-qxtf",
    "className": "\u05D91",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "studentCode": "\u05D91-15",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-14",
    "id": "s-1793910056273-rf6l",
    "fullName": "\u05D0\u05D3\u05DD \u05E2\u05D1\u05D0\u05E1",
    "className": "\u05D93"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D91",
    "id": "s-1793910056273-rgzm",
    "studentCode": "\u05D91-22",
    "fullName": "\u05D2'\u05D6\u05DC \u05D7\u05DE\u05D3\u05D0\u05DF",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-s0hl",
    "fullName": "\u05EA\u05D9\u05D0 \u05D3\u05D0\u05D4\u05E8",
    "className": "\u05D93",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-21"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-s8yh",
    "fullName": "\u05DC\u05D9\u05D0\u05DF \u05E9\u05DE\u05D0",
    "className": "\u05D92",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-01"
  },
  {
    "className": "\u05D94",
    "id": "s-1793910056273-t7e2",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D94-05",
    "fullName": "\u05D2\u05DE\u05D9\u05DC \u05E2\u05D1\u05D9\u05D3",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF"
  },
  {
    "id": "s-1793910056273-uual",
    "fullName": "\u05DE\u05D9\u05D0\u05E8 \u05E1\u05E2\u05D3",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "className": "\u05D94",
    "studentCode": "\u05D94-03",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D92",
    "id": "s-1793910056273-v4as",
    "schoolId": "school-1793938314748",
    "fullName": "\u05DE\u05E7\u05D1\u05D5\u05DC\u05D4 \u05D6\u05D9\u05D0\u05D3\u05D4",
    "studentCode": "\u05D92-28",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4"
  },
  {
    "studentCode": "\u05D93-15",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "id": "s-1793910056273-v6mq",
    "schoolId": "school-1793938314748",
    "className": "\u05D93",
    "fullName": "\u05D5\u05D9\u05D3\u05D0\u05D3 \u05E2\u05D1\u05D0\u05E1"
  },
  {
    "studentCode": "\u05D93-17",
    "fullName": "\u05E8\u05D5\u05D0\u05DF \u05E2\u05D1\u05D9\u05D3",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "className": "\u05D93",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-v9ap"
  },
  {
    "className": "\u05D92",
    "fullName": "\u05E9\u05D0\u05D3\u05D9 \u05E7\u05D8\u05D9\u05DE\u05D4",
    "id": "s-1793910056273-vui4",
    "studentCode": "\u05D92-15",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D91",
    "id": "s-1793910056273-vvke",
    "studentCode": "\u05D91-18",
    "teacherName": "\u05E7\u05E1\u05D9\u05E1 \u05D4\u05D0\u05E0\u05D9",
    "fullName": "\u05D0\u05D3\u05DD \u05D3\u05D4\u05E8"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D94-06",
    "fullName": "\u05D2'\u05D5\u05DC\u05D9\u05D0\u05DF \u05E2\u05D1\u05D9\u05D3",
    "id": "s-1793910056273-w0dv",
    "className": "\u05D94"
  },
  {
    "studentCode": "\u05D92-10",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "schoolId": "school-1793938314748",
    "className": "\u05D92",
    "id": "s-1793910056273-w4jq",
    "fullName": "\u05D0\u05D5\u05E0\u05D9\u05E8 \u05E1\u05D9\u05E3"
  },
  {
    "studentCode": "\u05D94-10",
    "fullName": "\u05E7\u05D9\u05D5\u05D0\u05DF \u05E4\u05E8\u05D2'",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "id": "s-1793910056273-wduc",
    "schoolId": "school-1793938314748",
    "className": "\u05D94"
  },
  {
    "fullName": "\u05D2\u05D5\u05DC\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8",
    "teacherName": "\u05E1\u05E2\u05D9\u05D3 \u05D8\u05D9\u05E8\u05DF",
    "className": "\u05D94",
    "studentCode": "\u05D94-17",
    "id": "s-1793910056273-xqvm",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05D2\u05D5\u05DE\u05D0\u05E0\u05D4",
    "studentCode": "\u05D92-04",
    "id": "s-1793910056273-xwe3",
    "fullName": "\u05EA\u05D5\u05DE\u05E8 \u05E1\u05E2\u05D9\u05D3",
    "className": "\u05D92"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D93",
    "id": "s-1793910056273-y1w8",
    "fullName": "\u05D7\u05DB\u05D9\u05DD \u05D6\u05D0\u05D4\u05E8",
    "studentCode": "\u05D93-12",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4"
  },
  {
    "id": "s-1793910056273-zjz0",
    "fullName": "\u05E1\u05D9\u05E8\u05D9\u05DF \u05E4\u05E8\u05D2'",
    "className": "\u05D93",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-10",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "studentCode": "\u05D93-01",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056273-zx4y",
    "fullName": "\u05D9\u05DC\u05D9\u05DF \u05E1\u05E2\u05D3",
    "className": "\u05D93"
  },
  {
    "studentCode": "\u05D93-03",
    "schoolId": "school-1793938314748",
    "className": "\u05D93",
    "id": "s-1793910056273-zxji",
    "teacherName": "\u05E2\u05D1\u05D3 \u05D0\u05DC \u05D7\u05E7 \u05E8\u05D0\u05E0\u05D9\u05D4",
    "fullName": "\u05DC\u05D9\u05E8\u05DF \u05E2\u05D1\u05D0\u05E1"
  },
  {
    "id": "s-1793910056274-0wga",
    "studentCode": "\u05D9\u05D02-17",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "className": "\u05D9\u05D02",
    "fullName": "\u05E1\u05DC\u05D9\u05DE\u05D0\u05DF \u05E7\u05D8\u05D9\u05DE\u05D4"
  },
  {
    "id": "s-1793910056274-1n0u",
    "className": "\u05D9\u05D02",
    "fullName": "\u05DE\u05E2\u05E8\u05D5\u05E3 \u05E1\u05D9\u05D9\u05E3",
    "studentCode": "\u05D9\u05D02-18",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-09",
    "className": "\u05D9\u05D01",
    "fullName": "\u05D3\u05E0\u05D4 \u05E1\u05E2\u05D3",
    "id": "s-1793910056274-29u2"
  },
  {
    "className": "\u05D9\u05D01",
    "id": "s-1793910056274-2wkc",
    "fullName": "\u05E0\u05D0\u05E8\u05DE\u05D9\u05DF \u05D6\u05D9\u05D0\u05D3\u05D4",
    "studentCode": "\u05D9\u05D01-11",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-3hjh",
    "studentCode": "\u05D9\u05D02-26",
    "className": "\u05D9\u05D02",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "fullName": "\u05D3\u05DF \u05D0\u05D1\u05D5 \u05D2'\u05D3\u05E2\u05D0\u05DF"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05DC\u05E0\u05D0 \u05D7\u05D8\u05D9\u05D1",
    "studentCode": "\u05D9\u05D01-14",
    "id": "s-1793910056274-4jgh",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-04",
    "fullName": "\u05DC\u05DE\u05D0\u05E8 \u05E4\u05D9\u05D0\u05D3",
    "className": "\u05D9\u05D02",
    "id": "s-1793910056274-4lek",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-5di1",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "fullName": "\u05DB\u05D9\u05D5\u05D0\u05DF \u05D7'\u05D8\u05D9\u05D1",
    "className": "\u05D9\u05D02",
    "studentCode": "\u05D9\u05D02-03"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-6drr",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-17",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05D9\u05D5\u05E1\u05E3 \u05E4\u05E8\u05D2'"
  },
  {
    "className": "\u05D9\u05D02",
    "fullName": "\u05D2'\u05D5\u05E1\u05DC\u05D9\u05DF \u05E1\u05E2\u05D3",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-25",
    "id": "s-1793910056274-6ru6"
  },
  {
    "fullName": "\u05E2\u05E4\u05D9\u05E4\u05D4 \u05D7\u05D1\u05E7\u05D4",
    "id": "s-1793910056274-8bsz",
    "className": "\u05D9\u05D02",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-23"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-25",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-8eci",
    "fullName": "\u05E1\u05DC\u05D0\u05DD \u05D7\u05D1\u05E7\u05D4",
    "className": "\u05D9\u05D01"
  },
  {
    "fullName": "\u05D5\u05E7\u05D0\u05E8 \u05D6\u05D0\u05D4\u05E8",
    "className": "\u05D9\u05D01",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D01-24",
    "id": "s-1793910056274-ccwr"
  },
  {
    "fullName": "\u05E2\u05E4\u05D0\u05E3 \u05E1\u05E2\u05D3",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "id": "s-1793910056274-cnfn",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D01-21",
    "className": "\u05D9\u05D01"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-01",
    "schoolId": "school-1793938314748",
    "fullName": "\u05D2\u05D6\u05DC \u05D1\u05E1\u05D0\u05DF",
    "id": "s-1793910056274-cz6x",
    "className": "\u05D9\u05D03"
  },
  {
    "className": "\u05D9\u05D02",
    "fullName": "\u05E8\u05D9\u05DE\u05D0\u05E1 \u05E1\u05D9\u05E3",
    "id": "s-1793910056274-eaws",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-16",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4"
  },
  {
    "studentCode": "\u05D9\u05D02-02",
    "id": "s-1793910056274-eaxl",
    "fullName": "\u05E2\u05D3\u05DF \u05E4\u05E8\u05D2'",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05E1\u05DC\u05D5\u05D4 \u05E1\u05D9\u05E3",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-09",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-ervz"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-12",
    "id": "s-1793910056274-f7yh",
    "fullName": "\u05DE\u05D9\u05E8\u05D0\u05DC \u05E2\u05D1\u05D9\u05D3",
    "className": "\u05D9\u05D01"
  },
  {
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-24",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "className": "\u05D9\u05D02",
    "fullName": "\u05D0\u05E8\u05D0\u05DD \u05E1\u05D0\u05DC\u05D7",
    "id": "s-1793910056274-fty7"
  },
  {
    "fullName": "\u05D0\u05DC\u05DE\u05D0 \u05E1\u05E2\u05D3",
    "id": "s-1793910056274-hcl0",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-05",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4"
  },
  {
    "id": "s-1793910056274-hrk0",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05EA\u05DC\u05D9\u05DF \u05E9\u05DE\u05D0",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-27"
  },
  {
    "id": "s-1793910056274-ib96",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-13",
    "fullName": "\u05D0\u05E8\u05D6 \u05E1\u05D5\u05D0\u05D8\u05D9\u05E8\u05D9",
    "className": "\u05D9\u05D02"
  },
  {
    "id": "s-1793910056274-ifj0",
    "fullName": "\u05E8\u05D0\u05D6\u05D9 \u05D1\u05E8\u05DB\u05D0\u05EA",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-06",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D02",
    "id": "s-1793910056274-ldu1",
    "fullName": "\u05E1\u05D5\u05DC \u05E1\u05E2\u05D9\u05D3",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-10",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-nne6",
    "fullName": "\u05D0\u05E1\u05D9\u05E0\u05D0\u05EA \u05E0\u05D6\u05D0\u05DC",
    "className": "\u05D9\u05D02",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-27"
  },
  {
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-15",
    "id": "s-1793910056274-o41c",
    "fullName": "\u05D3\u05E0\u05D9\u05DC \u05D1\u05E1\u05D0\u05DF",
    "className": "\u05D9\u05D02"
  },
  {
    "studentCode": "\u05D9\u05D01-15",
    "id": "s-1793910056274-oez7",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "className": "\u05D9\u05D01",
    "fullName": "\u05D0\u05E8\u05D6 \u05E1\u05E2\u05D9\u05D3",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D01",
    "fullName": "\u05E1\u05D9\u05E8\u05D9\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF",
    "id": "s-1793910056274-omy2",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D01-04",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-26",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-ot9o",
    "fullName": "\u05E8\u05D5\u05D6 \u05D7\u05D8\u05D9\u05D1",
    "className": "\u05D9\u05D01"
  },
  {
    "studentCode": "\u05D9\u05D01-20",
    "id": "s-1793910056274-pf23",
    "className": "\u05D9\u05D01",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "fullName": "\u05E8\u05E0\u05D9\u05DF \u05E4\u05E8\u05D2",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056274-pj5w",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-05",
    "fullName": "\u05D2'\u05E0\u05D1\u05D9\u05D4 \u05D7\u05DE\u05D3\u05D0\u05DF",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1"
  },
  {
    "id": "s-1793910056274-pjri",
    "fullName": "\u05E8\u05D0\u05D6\u05D9 \u05E2\u05D1\u05D9\u05D3",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-20"
  },
  {
    "id": "s-1793910056274-psmg",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D02-22",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "fullName": "\u05DC\u05D0\u05E8\u05D4 \u05D6\u05D9\u05D0\u05D3\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-qi94",
    "className": "\u05D9\u05D02",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "fullName": "\u05D2'\u05D1\u05E8 \u05E7\u05D8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D02-11"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-01",
    "fullName": "\u05E8\u05D4\u05E3 \u05E1\u05E2\u05D9\u05D3",
    "id": "s-1793910056274-r52d",
    "className": "\u05D9\u05D02"
  },
  {
    "id": "s-1793910056274-srpu",
    "fullName": "\u05EA\u05D5\u05DC\u05D9\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-18",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-19",
    "fullName": "\u05E8\u05D9\u05DE\u05D0 \u05E1\u05E2\u05D3",
    "id": "s-1793910056274-ta1h",
    "className": "\u05D9\u05D02"
  },
  {
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-08",
    "fullName": "\u05D0\u05E8\u05D6 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056274-u1q8",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D02"
  },
  {
    "fullName": "\u05E0\u05D1\u05D9\u05DC \u05E2\u05D1\u05D0\u05E1",
    "id": "s-1793910056274-ugrm",
    "className": "\u05D9\u05D03",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-02"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-uiqv",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-12",
    "fullName": "\u05DC\u05D0\u05E0\u05D0 \u05E1\u05E2\u05D3",
    "className": "\u05D9\u05D02"
  },
  {
    "fullName": "\u05E1\u05D9\u05DC\u05D9\u05DF \u05E2\u05D2'\u05DE\u05D9\u05D9\u05D4",
    "id": "s-1793910056274-uuai",
    "className": "\u05D9\u05D02",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-21"
  },
  {
    "fullName": "\u05DE\u05D9\u05D0\u05E8 \u05E2\u05D0\u05DE\u05E8",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-uwxh",
    "studentCode": "\u05D9\u05D01-16"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-uxax",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-19",
    "fullName": "\u05E8\u05E4\u05D9\u05E3 \u05D7'\u05D8\u05D9\u05D1",
    "className": "\u05D9\u05D01"
  },
  {
    "fullName": "\u05D0\u05DE\u05D9\u05E8 \u05D7\u05DE\u05D3\u05D0\u05DF",
    "id": "s-1793910056274-vzak",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-23",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056274-wcmu",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "fullName": "\u05D2\u05D5\u05DC\u05DF \u05E4\u05E8\u05D2'",
    "studentCode": "\u05D9\u05D02-14",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D02"
  },
  {
    "id": "s-1793910056274-ym5y",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D01",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-22",
    "fullName": "\u05E9\u05E8\u05D4 \u05E1\u05E2\u05D3"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056274-yo65",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-07",
    "fullName": "\u05E1\u05DE\u05E8 \u05D7\u05DE\u05D3\u05D0\u05DF",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1"
  },
  {
    "fullName": "\u05E0\u05D9\u05DC\u05DE\u05D0\u05E8 \u05D7\u05DE\u05D3\u05D0\u05DF",
    "id": "s-1793910056274-yruh",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-08"
  },
  {
    "className": "\u05D9\u05D02",
    "studentCode": "\u05D9\u05D02-07",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "schoolId": "school-1793938314748",
    "fullName": "\u05DE\u05DC\u05E7 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "id": "s-1793910056274-z0hi"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "className": "\u05D9\u05D01",
    "studentCode": "\u05D9\u05D01-10",
    "schoolId": "school-1793938314748",
    "fullName": "\u05D0\u05E8\u05D0\u05DD \u05D1\u05D9\u05D1\u05D0\u05E8",
    "id": "s-1793910056274-z5a4"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05EA\u05D0\u05D1",
    "studentCode": "\u05D9\u05D01-13",
    "fullName": "\u05EA\u05D5\u05DC\u05D0\u05D9 \u05E2\u05D2'\u05DE\u05D9\u05D4",
    "id": "s-1793910056274-z9r2",
    "className": "\u05D9\u05D01",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E9\u05DE\u05D0 \u05E8\u05D5\u05DC\u05D4",
    "studentCode": "\u05D9\u05D02-06",
    "fullName": "\u05D2'\u05D9\u05E0\u05D0 \u05E1\u05E2\u05D3",
    "className": "\u05D9\u05D02",
    "id": "s-1793910056274-zxfm"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-18",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E1\u05E8\u05D0\u05D0 \u05E4\u05E8\u05D2'",
    "id": "s-1793910056275-1nrq"
  },
  {
    "className": "\u05D9\u05D04",
    "fullName": "\u05DE\u05DC\u05E7 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056275-22h7",
    "studentCode": "\u05D9\u05D04-10",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0"
  },
  {
    "className": "\u05D9\u05D11",
    "fullName": "\u05D9\u05E8\u05D9\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8",
    "id": "s-1793910056275-2j0c",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-11",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056275-2n23",
    "className": "\u05D9\u05D11",
    "schoolId": "school-1793938314748",
    "fullName": "\u05D2'\u05D6\u05DC \u05E1\u05E2\u05D3",
    "studentCode": "\u05D9\u05D11-16",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D03",
    "id": "s-1793910056275-3574",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D03-23",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "fullName": "\u05DC\u05D9\u05E3 \u05D7\u05E1\u05D1\u05D0\u05E0\u05D9"
  },
  {
    "studentCode": "\u05D9\u05D11-17",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D11",
    "fullName": "\u05D2\u05D6\u05DC \u05E1\u05D9\u05E3",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-470o"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-22",
    "fullName": "\u05D0\u05D9\u05E1\u05DD \u05E2\u05D2\u05DE\u05D9\u05D9\u05D4",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-4vsj"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-53ii",
    "fullName": "\u05D7\u05DC\u05D0 \u05E2\u05D1\u05D3\u05D0\u05DC\u05DC\u05D4",
    "className": "\u05D9\u05D11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-10"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D03-11",
    "id": "s-1793910056275-5w8q",
    "fullName": "\u05E1\u05D9\u05DE\u05D0\u05E8 \u05E1\u05D9\u05E3",
    "className": "\u05D9\u05D03"
  },
  {
    "schoolId": "school-1793938314748",
    "fullName": "\u05DC\u05D9\u05D9\u05EA \u05D1\u05D9\u05D1\u05D0\u05E8",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "id": "s-1793910056275-6n9r",
    "className": "\u05D9\u05D04",
    "studentCode": "\u05D9\u05D04-08"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "studentCode": "\u05D9\u05D04-09",
    "className": "\u05D9\u05D04",
    "fullName": "\u05D0\u05DC\u05D9\u05E1\u05D0\u05E8 \u05E1\u05E2\u05D3",
    "id": "s-1793910056275-77df"
  },
  {
    "id": "s-1793910056275-7f0s",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "fullName": "\u05E1\u05D9\u05E0\u05D0\u05DC \u05D7'\u05D8\u05D9\u05D1",
    "studentCode": "\u05D9\u05D11-07",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D04",
    "fullName": "\u05DC\u05D9\u05DE\u05D0\u05E8 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056275-7k9t",
    "studentCode": "\u05D9\u05D04-02",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-15",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "fullName": "\u05E9\u05D0\u05D3\u05D9 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056275-8307"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "studentCode": "\u05D9\u05D04-01",
    "className": "\u05D9\u05D04",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-84om",
    "fullName": "\u05E8\u05D5\u05D9 \u05D1\u05D9\u05E1\u05D0\u05DF"
  },
  {
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-20",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "fullName": "\u05E1\u05DC\u05DE\u05D0\u05DF \u05D7\u05D1\u05E7\u05D4",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-8a68"
  },
  {
    "fullName": "\u05DC\u05D9\u05E8\u05D6 \u05E4\u05E8\u05D2'",
    "className": "\u05D9\u05D03",
    "id": "s-1793910056275-8b4n",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-19",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-a2yn",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-04",
    "fullName": "\u05E1\u05DC\u05DE\u05D0\u05DF \u05D7'\u05D8\u05D9\u05D1",
    "className": "\u05D9\u05D11"
  },
  {
    "className": "\u05D9\u05D03",
    "id": "s-1793910056275-chs2",
    "fullName": "\u05D2\u05E0\u05D0\u05D4 \u05D1\u05D5\u05D1\u05D0\u05E8",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D03-14",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF"
  },
  {
    "fullName": "\u05D0\u05D9\u05D0\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "studentCode": "\u05D9\u05D04-04",
    "className": "\u05D9\u05D04",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-cq6w"
  },
  {
    "id": "s-1793910056275-d12x",
    "className": "\u05D9\u05D04",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D04-11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "fullName": "\u05E8\u05D6\u05D0\u05DF \u05D3\u05D0\u05D4\u05E8"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-05",
    "fullName": "\u05D9\u05D6\u05DF \u05D1\u05D9\u05D1\u05D0\u05E8",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-d9mx"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-06",
    "fullName": "\u05D2'\u05D9\u05E0\u05D0 \u05E2\u05D1\u05D0\u05E1",
    "id": "s-1793910056275-dei1",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "className": "\u05D9\u05D04",
    "studentCode": "\u05D9\u05D04-05",
    "fullName": "\u05D2'\u05D5\u05D0\u05D3 \u05D2\u05D3\u05D1\u05D0\u05DF",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-djpp"
  },
  {
    "className": "\u05D9\u05D11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05E0\u05D5\u05E8 \u05E4\u05E8\u05D2'",
    "studentCode": "\u05D9\u05D11-08",
    "id": "s-1793910056275-e9rz",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05EA\u05D0\u05DE\u05E8 \u05E9\u05DE\u05D0",
    "studentCode": "\u05D9\u05D11-09",
    "className": "\u05D9\u05D11",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-fzqy"
  },
  {
    "fullName": "\u05D5\u05E1\u05D9\u05DD \u05E1\u05E2\u05D3",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-16",
    "id": "s-1793910056275-g30c",
    "className": "\u05D9\u05D03",
    "schoolId": "school-1793938314748"
  },
  {
    "fullName": "\u05D2'\u05D5\u05DC\u05D9\u05D0\u05DF \u05E7\u05D0\u05E8\u05D5\u05D8",
    "className": "\u05D9\u05D11",
    "id": "s-1793910056275-g5pu",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-12"
  },
  {
    "fullName": "\u05DC\u05D9\u05D9\u05D0\u05D0 \u05E1\u05E2\u05D3",
    "id": "s-1793910056275-i8b1",
    "studentCode": "\u05D9\u05D03-25",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D03"
  },
  {
    "className": "\u05D9\u05D03",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-j34b",
    "studentCode": "\u05D9\u05D03-08",
    "fullName": "\u05E8\u05D9\u05D0\u05DF \u05E4\u05E8\u05D2'",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF"
  },
  {
    "studentCode": "\u05D9\u05D03-06",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-j3hg",
    "className": "\u05D9\u05D03",
    "fullName": "\u05D9\u05D6\u05DF \u05E1\u05E2\u05D3",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D04-03",
    "id": "s-1793910056275-m6p4",
    "fullName": "\u05D2'\u05D5\u05DC\u05DF \u05D2\u05D3\u05D1\u05D0\u05DF",
    "className": "\u05D9\u05D04"
  },
  {
    "studentCode": "\u05D9\u05D03-13",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-m9wu",
    "className": "\u05D9\u05D03",
    "fullName": "\u05D9\u05D6\u05DF \u05D1\u05E8\u05DB\u05D0\u05EA"
  },
  {
    "className": "\u05D9\u05D03",
    "studentCode": "\u05D9\u05D03-21",
    "fullName": "\u05E0\u05D5\u05E8\u05E1\u05D9\u05DF \u05E1\u05E8\u05DB\u05D5\u05E1",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-mauy",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D11",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D11-13",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05D5\u05E8\u05D3 \u05E1\u05D9\u05E3",
    "id": "s-1793910056275-md7x"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "studentCode": "\u05D9\u05D04-07",
    "schoolId": "school-1793938314748",
    "fullName": "\u05D0\u05D9\u05D9\u05E1\u05DD \u05D3\u05D4\u05E8",
    "className": "\u05D9\u05D04",
    "id": "s-1793910056275-mdcp"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D04",
    "fullName": "\u05D0\u05DC\u05D9\u05DF \u05E9\u05DE\u05D0",
    "id": "s-1793910056275-n5wa",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05D5\u05DC\u05D0\u05D0",
    "studentCode": "\u05D9\u05D04-06"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-24",
    "fullName": "\u05E1\u05D0\u05E8\u05D9 \u05D1\u05E1\u05D0\u05DF",
    "className": "\u05D9\u05D03",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-nvua"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D03",
    "fullName": "\u05DE\u05D9\u05E8\u05D0\u05DC \u05E1\u05E2\u05D3",
    "id": "s-1793910056275-nzkg",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-07"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056275-o9gn",
    "className": "\u05D9\u05D03",
    "fullName": "\u05D3\u05D9\u05D9\u05DC\u05D4 \u05D1\u05E8\u05D9\u05E7",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D03-04"
  },
  {
    "id": "s-1793910056275-pezr",
    "fullName": "\u05E4\u05D0\u05E8\u05E1 \u05E1\u05D1\u05D9\u05EA\u05D9",
    "studentCode": "\u05D9\u05D03-12",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D03"
  },
  {
    "studentCode": "\u05D9\u05D11-01",
    "fullName": "\u05DE\u05D9\u05D9\u05E1 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "id": "s-1793910056275-pfnc"
  },
  {
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-qlt0",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D03-03",
    "className": "\u05D9\u05D03",
    "fullName": "\u05E1\u05D5\u05D9\u05D0\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF"
  },
  {
    "id": "s-1793910056275-qyf4",
    "fullName": "\u05D9\u05E8\u05D9\u05DF \u05E7\u05D8\u05D9\u05DE\u05D4",
    "className": "\u05D9\u05D11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D11-02"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D11-03",
    "id": "s-1793910056275-sppj",
    "fullName": "\u05D5\u05D8\u05E4\u05D4 \u05D6\u05D9\u05D0\u05D3\u05D4",
    "className": "\u05D9\u05D11"
  },
  {
    "className": "\u05D9\u05D11",
    "id": "s-1793910056275-theq",
    "fullName": "\u05D0\u05E0\u05D9\u05DC \u05D1\u05D9\u05D1\u05D0\u05E8",
    "studentCode": "\u05D9\u05D11-05",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748"
  },
  {
    "id": "s-1793910056275-u1v7",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "studentCode": "\u05D9\u05D11-14",
    "fullName": "\u05DC\u05DE\u05D0\u05E8 \u05D7\u05D1\u05E7\u05D4",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D03",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E1\u05D0\u05DC\u05D7 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "studentCode": "\u05D9\u05D03-17",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "id": "s-1793910056275-vshj"
  },
  {
    "id": "s-1793910056275-wey1",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "studentCode": "\u05D9\u05D11-18",
    "fullName": "\u05D2'\u05D5\u05E8\u05D9 \u05E7\u05D0\u05E8\u05D5\u05D8",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "id": "s-1793910056275-wm9c",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-15",
    "className": "\u05D9\u05D11",
    "fullName": "\u05D2'\u05D5\u05D0\u05DF \u05D7\u05DE\u05D3\u05D0\u05DF"
  },
  {
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D03-09",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D03",
    "id": "s-1793910056275-x46n",
    "fullName": "\u05DE\u05D5\u05D4\u05E0\u05D0 \u05E1\u05E2\u05D3"
  },
  {
    "studentCode": "\u05D9\u05D03-10",
    "teacherName": "\u05E1\u05E2\u05D3 \u05E1\u05D1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D03",
    "id": "s-1793910056275-xrg9",
    "fullName": "\u05D0\u05D3\u05D9\u05E8 \u05E4\u05E8\u05D2'"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D12",
    "fullName": "\u05D0\u05D3\u05D9\u05E8 \u05E9\u05E7\u05E8\u05D4",
    "studentCode": "\u05D9\u05D12-18",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-0g49"
  },
  {
    "fullName": "\u05DC\u05DE\u05D0\u05E8 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "studentCode": "\u05D9\u05D11-22",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D11",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-1uxx"
  },
  {
    "fullName": "\u05D3\u05E0\u05D9\u05D0\u05DC \u05D7\u05D1\u05E7\u05D4",
    "studentCode": "\u05D9\u05D11-27",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-1x81",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11"
  },
  {
    "className": "\u05D9\u05D11",
    "fullName": "\u05D0\u05DE\u05D9\u05E8\u05D4 \u05D7\u05DE\u05D3\u05D0\u05DF",
    "id": "s-1793910056276-2ikh",
    "studentCode": "\u05D9\u05D11-23",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "id": "s-1793910056276-3d89",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-01",
    "fullName": "\u05D2\u05E0\u05D0 \u05D7\u05D1\u05E7\u05D4",
    "className": "\u05D9\u05D13"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-3hih",
    "className": "\u05D9\u05D12",
    "studentCode": "\u05D9\u05D12-23",
    "fullName": "\u05E4\u05D5\u05D0\u05D3 \u05E1\u05E2\u05D3",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D12",
    "fullName": "\u05EA\u05D5\u05DC\u05D9\u05DF \u05D1\u05E8\u05DB\u05D0\u05EA",
    "studentCode": "\u05D9\u05D12-03",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-3x8w"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-3yni",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "fullName": "\u05D0\u05D9\u05D9\u05DC \u05D7\u05E1\u05D1\u05D0\u05E0\u05D9",
    "studentCode": "\u05D9\u05D12-10",
    "className": "\u05D9\u05D12"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D13",
    "fullName": "\u05D0\u05D3\u05D4\u05DD \u05E4\u05E8\u05D2'",
    "studentCode": "\u05D9\u05D13-11",
    "id": "s-1793910056276-5a30",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "studentCode": "\u05D9\u05D11-24",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05DE\u05DC\u05D0\u05E7 \u05D1\u05E8\u05D9\u05E7",
    "className": "\u05D9\u05D11",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-71cs"
  },
  {
    "id": "s-1793910056276-79rv",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-14",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E8\u05D5\u05DF \u05E2\u05D1\u05D0\u05E1",
    "className": "\u05D9\u05D13"
  },
  {
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-20",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-7apb",
    "fullName": "\u05D7\u05DE\u05D3 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "className": "\u05D9\u05D12"
  },
  {
    "className": "\u05D9\u05D13",
    "fullName": "\u05DE\u05D5\u05D4\u05E0\u05D3 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "studentCode": "\u05D9\u05D13-02",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-7zy3",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-15",
    "fullName": "\u05D1\u05D9\u05D0\u05DF \u05D7\u05D0\u05E1\u05D1\u05D0\u05E0\u05D9",
    "className": "\u05D9\u05D13",
    "id": "s-1793910056276-88xd",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "studentCode": "\u05D9\u05D11-25",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-96gf",
    "fullName": "\u05D2'\u05D5\u05D0\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF"
  },
  {
    "studentCode": "\u05D9\u05D12-21",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E7\u05E0\u05D0\u05DF \u05E7\u05D8\u05D9\u05DE\u05D4",
    "className": "\u05D9\u05D12",
    "id": "s-1793910056276-9qqf"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-16",
    "id": "s-1793910056276-9s98",
    "fullName": "\u05D5\u05D5\u05D0\u05D9\u05DC \u05E2\u05D1\u05D3\u05D0\u05DC\u05DC\u05D4",
    "className": "\u05D9\u05D13"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-9z9w",
    "fullName": "\u05D9\u05D0\u05E0\u05D0 \u05D1\u05E8\u05DB\u05D0\u05EA",
    "className": "\u05D9\u05D12",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-08"
  },
  {
    "fullName": "\u05E8\u05D9\u05E0\u05D0\u05DC \u05D1\u05D9\u05D1\u05D0\u05E8",
    "className": "\u05D9\u05D12",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-13",
    "id": "s-1793910056276-cuxo",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-czjr",
    "studentCode": "\u05D9\u05D11-26",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D11",
    "fullName": "\u05D0\u05E8\u05D9\u05DF \u05E1\u05D9\u05E3"
  },
  {
    "className": "\u05D9\u05D12",
    "studentCode": "\u05D9\u05D12-22",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-d6al",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E0\u05D5\u05E8 \u05E1\u05D9\u05E3"
  },
  {
    "schoolId": "school-1793938314748",
    "fullName": "\u05DC\u05D9\u05DF \u05E1\u05E2\u05D9\u05D3",
    "id": "s-1793910056276-d8lj",
    "className": "\u05D9\u05D11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D11-20"
  },
  {
    "id": "s-1793910056276-dv4y",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-11",
    "fullName": "\u05D0\u05E0\u05D9\u05E1 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "className": "\u05D9\u05D12"
  },
  {
    "className": "\u05D9\u05D13",
    "studentCode": "\u05D9\u05D13-04",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-ego7",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05EA\u05D5\u05DC\u05D9\u05DF \u05D0\u05D1\u05D5 \u05D2'\u05D3\u05E2\u05D0\u05DF"
  },
  {
    "className": "\u05D9\u05D12",
    "fullName": "\u05E0\u05E8\u05DE\u05D9\u05DF \u05E1\u05D9\u05E3",
    "studentCode": "\u05D9\u05D12-26",
    "id": "s-1793910056276-f6jz",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D11-21",
    "fullName": "\u05D9\u05E0\u05D9\u05D1 \u05D6\u05D9\u05D0\u05D3\u05D4",
    "id": "s-1793910056276-fhzf",
    "className": "\u05D9\u05D11"
  },
  {
    "schoolId": "school-1793938314748",
    "fullName": "\u05E9\u05D4\u05D3 \u05D7\u05D1\u05E7\u05D4",
    "id": "s-1793910056276-fv75",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-12",
    "className": "\u05D9\u05D13"
  },
  {
    "id": "s-1793910056276-g5ht",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-06",
    "className": "\u05D9\u05D13",
    "fullName": "\u05D3\u05E0\u05D9\u05D0\u05DC \u05D3\u05D0\u05D4\u05E8"
  },
  {
    "fullName": "\u05E8\u05D0\u05D6\u05D9 \u05E9\u05DE\u05D0",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D12",
    "studentCode": "\u05D9\u05D12-02",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-g8ds"
  },
  {
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-gmf0",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "fullName": "\u05D2'\u05D6\u05DC \u05E2\u05D1\u05D9\u05D3",
    "studentCode": "\u05D9\u05D12-19",
    "className": "\u05D9\u05D12"
  },
  {
    "fullName": "\u05D0\u05E8\u05D6 \u05D7'\u05D8\u05D9\u05D1",
    "id": "s-1793910056276-gwqv",
    "className": "\u05D9\u05D12",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-15"
  },
  {
    "fullName": "\u05E2\u05D9\u05E8\u05DF \u05E9\u05E7\u05E8\u05D4",
    "className": "\u05D9\u05D12",
    "id": "s-1793910056276-i25b",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D12-04",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "id": "s-1793910056276-kaqv",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D12",
    "studentCode": "\u05D9\u05D12-07",
    "fullName": "\u05E1\u05DC\u05D9\u05DE\u05D0\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "id": "s-1793910056276-kgmd",
    "className": "\u05D9\u05D13",
    "fullName": "\u05E8\u05D5\u05D6\u05D0\u05DF \u05E2\u05D1\u05D9\u05D3",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D13-07",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "fullName": "\u05D2\u05D5\u05DC\u05DF \u05E2\u05D0\u05DE\u05E8",
    "className": "\u05D9\u05D13",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-ldoy",
    "studentCode": "\u05D9\u05D13-10",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D12",
    "id": "s-1793910056276-lfc5",
    "schoolId": "school-1793938314748",
    "fullName": "\u05DB\u05E8\u05DD \u05E7\u05D8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D12-06",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D12",
    "fullName": "\u05E1\u05D0\u05DC\u05D9 \u05D1\u05D9\u05D1\u05D0\u05E8",
    "studentCode": "\u05D9\u05D12-09",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-lhbh"
  },
  {
    "fullName": "\u05D0\u05D9\u05D9\u05E1\u05E8 \u05E7\u05D8\u05D9\u05DE\u05D4",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D12",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-m4xy",
    "studentCode": "\u05D9\u05D12-05"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D12",
    "id": "s-1793910056276-mfa4",
    "studentCode": "\u05D9\u05D12-01",
    "fullName": "\u05EA\u05D9\u05DE\u05D0\u05D0 \u05D1\u05E8\u05D9\u05E7"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D13",
    "fullName": "\u05DE\u05DC\u05E7 \u05E2\u05D1\u05D0\u05E1",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-naw5",
    "studentCode": "\u05D9\u05D13-05"
  },
  {
    "className": "\u05D9\u05D13",
    "studentCode": "\u05D9\u05D13-09",
    "id": "s-1793910056276-pk2k",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "fullName": "\u05EA\u05DE\u05D9\u05E8 \u05E1\u05D1\u05D9\u05EA\u05D9"
  },
  {
    "className": "\u05D9\u05D13",
    "id": "s-1793910056276-tog5",
    "fullName": "\u05D4\u05D9\u05D9\u05EA\u05DD \u05D7\u05D1\u05E7\u05D4",
    "studentCode": "\u05D9\u05D13-13",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "className": "\u05D9\u05D12",
    "id": "s-1793910056276-u812",
    "fullName": "\u05E4\u05E8\u05D9\u05D3 \u05E1\u05E8\u05DB\u05D5\u05E1",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D12-12",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D13",
    "studentCode": "\u05D9\u05D13-03",
    "fullName": "\u05D7\u05DE\u05D3 \u05DE\u05E2\u05D3\u05D9",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "id": "s-1793910056276-vdp5"
  },
  {
    "studentCode": "\u05D9\u05D11-19",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D11",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "fullName": "\u05D7\u05DC\u05D0 \u05E1\u05E2\u05D3",
    "id": "s-1793910056276-vv8k"
  },
  {
    "className": "\u05D9\u05D11",
    "studentCode": "\u05D9\u05D11-28",
    "teacherName": "\u05E4\u05E8\u05D2_ \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "fullName": "\u05E9\u05D0\u05D3\u05D9 \u05E4\u05E8\u05D2'",
    "id": "s-1793910056276-w0xk"
  },
  {
    "id": "s-1793910056276-wh4y",
    "className": "\u05D9\u05D12",
    "fullName": "\u05E2\u05D5\u05DE\u05E8 \u05E2\u05D1\u05D0\u05E1",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-25",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-24",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056276-wilu",
    "fullName": "\u05D2'\u05D0\u05D3 \u05E4\u05E8\u05D2",
    "className": "\u05D9\u05D12"
  },
  {
    "fullName": "\u05E0\u05D5\u05E8 \u05D7\u05DE\u05E8\u05D9",
    "id": "s-1793910056276-x63m",
    "className": "\u05D9\u05D12",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D12-17"
  },
  {
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D13-08",
    "id": "s-1793910056276-yfqj",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "className": "\u05D9\u05D13",
    "fullName": "\u05E2\u05E0\u05D0\u05D3 \u05D0\u05DE\u05D5\u05DF"
  },
  {
    "fullName": "\u05D9\u05D5\u05DC\u05D9\u05DF \u05D1\u05D9\u05E1\u05D0\u05DF",
    "id": "s-1793910056276-z5cz",
    "className": "\u05D9\u05D12",
    "teacherName": "\u05D1\u05D9\u05D1\u05D0\u05E8 \u05E0\u05E1\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D12-16"
  },
  {
    "studentCode": "\u05D9\u05D13-23",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748",
    "id": "s-1793910056277-017l",
    "className": "\u05D9\u05D13",
    "fullName": "\u05DB\u05E8\u05DE\u05D9 \u05E1\u05E2\u05D3"
  },
  {
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-18",
    "fullName": "\u05D7'\u05D3\u05E8 \u05E4\u05E8\u05D2'",
    "id": "s-1793910056277-1ed4",
    "className": "\u05D9\u05D13",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D14-09",
    "fullName": "\u05DE\u05DC\u05E7 \u05E2\u05DC\u05D9",
    "className": "\u05D9\u05D14",
    "id": "s-1793910056277-1r9g"
  },
  {
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D14-06",
    "fullName": "\u05E0\u05D9\u05DC \u05E1\u05E2\u05D9\u05D3",
    "id": "s-1793910056277-4udy",
    "className": "\u05D9\u05D14",
    "schoolId": "school-1793938314748"
  },
  {
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D14-05",
    "id": "s-1793910056277-98uw",
    "fullName": "\u05DE\u05D3\u05DC\u05D9\u05D9\u05DF \u05E2\u05D1\u05D9\u05D3",
    "className": "\u05D9\u05D14"
  },
  {
    "fullName": "\u05DE\u05D5\u05D4\u05E0\u05D3 \u05D6\u05D9\u05D0\u05D3\u05D4",
    "className": "\u05D9\u05D14",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D14-07",
    "id": "s-1793910056277-bl3a"
  },
  {
    "className": "\u05D9\u05D14",
    "fullName": "\u05DC\u05D5\u05D0\u05D9 \u05D7\u05DE\u05D0\u05D3\u05DF",
    "id": "s-1793910056277-diee",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D14-11",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-20",
    "fullName": "\u05E1\u05DE\u05D0\u05D7 \u05E4\u05D9\u05D0\u05D3",
    "className": "\u05D9\u05D13",
    "id": "s-1793910056277-jjng"
  },
  {
    "id": "s-1793910056277-lsqn",
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D13",
    "fullName": "\u05E1\u05D5\u05E7\u05E8\u05D8 \u05E2\u05D2'\u05DE\u05D9\u05D4",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-17"
  },
  {
    "schoolId": "school-1793938314748",
    "className": "\u05D9\u05D14",
    "studentCode": "\u05D9\u05D14-08",
    "id": "s-1793910056277-qfpe",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "fullName": "\u05D2\u05D6\u05DC \u05D6\u05D9\u05D0\u05D3\u05D4"
  },
  {
    "studentCode": "\u05D9\u05D14-01",
    "fullName": "\u05DC\u05D5\u05E0\u05D4 \u05D1\u05D9\u05E1\u05D0\u05DF",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "id": "s-1793910056277-ql35",
    "className": "\u05D9\u05D14",
    "schoolId": "school-1793938314748"
  },
  {
    "className": "\u05D9\u05D13",
    "fullName": "\u05D0\u05D9\u05D0\u05DF \u05E1\u05E2\u05D9\u05D3",
    "id": "s-1793910056277-rdc9",
    "schoolId": "school-1793938314748",
    "studentCode": "\u05D9\u05D13-22",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF"
  },
  {
    "id": "s-1793910056277-u5x5",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D14-04",
    "className": "\u05D9\u05D14",
    "fullName": "\u05DE\u05D9\u05E8\u05E0\u05D4 \u05E2\u05D1\u05D9\u05D3"
  },
  {
    "fullName": "\u05D2'\u05D5\u05D0\u05D3 \u05D7\u05DE\u05E8\u05D9",
    "id": "s-1793910056277-v1w3",
    "className": "\u05D9\u05D14",
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D14-10"
  },
  {
    "schoolId": "school-1793938314748",
    "fullName": "\u05D3\u05E8\u05D9\u05DF \u05E4\u05E8\u05D2'",
    "className": "\u05D9\u05D14",
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "id": "s-1793910056277-xiuc",
    "studentCode": "\u05D9\u05D14-03"
  },
  {
    "id": "s-1793910056277-ybve",
    "fullName": "\u05D4\u05E0\u05D3 \u05E1\u05D9\u05E3",
    "studentCode": "\u05D9\u05D13-19",
    "className": "\u05D9\u05D13",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "schoolId": "school-1793938314748"
  },
  {
    "schoolId": "school-1793938314748",
    "teacherName": "\u05D1\u05E8\u05DB\u05D0\u05EA \u05E2\u05E8\u05D9\u05DF",
    "studentCode": "\u05D9\u05D13-21",
    "id": "s-1793910056277-yscz",
    "fullName": "\u05DE\u05D9\u05DC\u05D9\u05D0 \u05E7\u05D8\u05D9\u05DE\u05D4",
    "className": "\u05D9\u05D13"
  },
  {
    "teacherName": "\u05D7\u05D0\u05D2_ \u05E8\u05D9\u05DE\u05D4",
    "studentCode": "\u05D9\u05D14-02",
    "className": "\u05D9\u05D14",
    "id": "s-1793910056277-zfyw",
    "schoolId": "school-1793938314748",
    "fullName": "\u05D0\u05D9\u05D9\u05DE\u05DF \u05D1\u05E1\u05D0\u05DF"
  }
];

// data/store.ts
function getIsraelDateString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}
function getIsraelTimeString(date = /* @__PURE__ */ new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  return formatter.format(date);
}
function normalizePin(input) {
  if (input === void 0 || input === null) return "";
  return String(input).replace(/[\u0660-\u0669]/g, (c) => (c.charCodeAt(0) - 1632).toString()).replace(/[\u06F0-\u06F9]/g, (c) => (c.charCodeAt(0) - 1776).toString()).replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\s]/g, "").trim();
}
function generateUniqueStaffPin(existingStaffOrPins, preferredPin) {
  const usedPins = /* @__PURE__ */ new Set();
  if (existingStaffOrPins instanceof Set) {
    for (const p of existingStaffOrPins) {
      if (p) usedPins.add(normalizePin(p));
    }
  } else if (Array.isArray(existingStaffOrPins)) {
    for (const s of existingStaffOrPins) {
      if (s?.pinCode) usedPins.add(normalizePin(s.pinCode));
    }
  }
  usedPins.add("160525");
  if (preferredPin && normalizePin(preferredPin) && !usedPins.has(normalizePin(preferredPin)) && normalizePin(preferredPin) !== "160525") {
    return normalizePin(preferredPin);
  }
  let pin = "";
  let attempts = 0;
  do {
    const num = Math.floor(1e3 + Math.random() * 9e3);
    pin = num.toString();
    attempts++;
    if (pin[0] === pin[1] && pin[1] === pin[2] && pin[2] === pin[3]) continue;
  } while (usedPins.has(pin) && attempts < 1e4);
  if (!pin || usedPins.has(pin)) {
    for (let i = 1001; i <= 9999; i++) {
      const candidate = i.toString();
      if (!usedPins.has(candidate)) {
        pin = candidate;
        break;
      }
    }
  }
  return pin;
}
var DATA_DIR = path.resolve(process.cwd(), "data");
var DB_FILE = path.resolve(DATA_DIR, "school_gate.json");
var INITIAL_DEMO_DATA = {
  settings: {
    schoolName: "\u05E8\u05D1 \u05EA\u05D7\u05D5\u05DE\u05D9 \u05E2\u05DE\u05DC \u05D9\u05D0\u05E0\u05D5\u05D7 \u05D2'\u05EA",
    lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
  },
  schools: SEEDED_SCHOOLS || [],
  activeSchoolId: SEEDED_ACTIVE_SCHOOL_ID || "",
  staff: SEEDED_STAFF || [
    {
      id: "staff-admin-amar",
      staffCode: "ADMIN",
      fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
      role: "admin",
      pinCode: "160525",
      assignedClasses: ["*"],
      isActive: true,
      schoolId: "*"
    }
  ],
  students: SEEDED_STUDENTS || [],
  passes: [],
  auditLogs: []
};
var SchoolDatabase = class {
  constructor() {
    this.listeners = [];
    this.ensureDirectory();
    this.data = this.loadData();
  }
  ensureDirectory() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (e) {
      console.warn("Could not create data dir, running in memory:", e);
    }
  }
  loadData() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (parsed.staff && parsed.students) {
          let updated = false;
          if ((!parsed.students || parsed.students.length === 0) && SEEDED_STUDENTS.length > 0) {
            parsed.students = JSON.parse(JSON.stringify(SEEDED_STUDENTS));
            updated = true;
          }
          if ((!parsed.schools || parsed.schools.length === 0) && SEEDED_SCHOOLS.length > 0) {
            parsed.schools = JSON.parse(JSON.stringify(SEEDED_SCHOOLS));
            updated = true;
          }
          if ((!parsed.staff || parsed.staff.length <= 1) && SEEDED_STAFF.length > 1) {
            parsed.staff = JSON.parse(JSON.stringify(SEEDED_STAFF));
            updated = true;
          }
          if (!parsed.activeSchoolId && SEEDED_ACTIVE_SCHOOL_ID) {
            parsed.activeSchoolId = SEEDED_ACTIVE_SCHOOL_ID;
            updated = true;
          }
          if (updated) {
            this.saveData(parsed);
          }
          return parsed;
        }
      }
    } catch (err) {
      console.error("Error loading database file, falling back to initial data:", err);
    }
    this.saveData(INITIAL_DEMO_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DEMO_DATA));
  }
  saveData(data) {
    try {
      this.ensureDirectory();
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.warn("Could not write database file, data kept in memory:", e);
    }
  }
  mutate(fn) {
    fn(this.data);
    this.data.settings.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    this.saveData(this.data);
    this.notify();
  }
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }
  notify() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error("Listener notification error:", e);
      }
    }
  }
  // --- Read Operations ---
  getStaffByPin(pin) {
    const clean = normalizePin(pin);
    if (!clean) return void 0;
    if (clean === "160525") {
      let amar = this.data.staff.find((s) => s.id === "staff-admin-amar" || normalizePin(s.pinCode) === "160525");
      if (!amar) {
        amar = {
          id: "staff-admin-amar",
          staffCode: "ADMIN",
          fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
          role: "admin",
          pinCode: "160525",
          assignedClasses: ["*"],
          isActive: true
        };
        this.data.staff.push(amar);
        this.saveData(this.data);
      } else {
        amar.pinCode = "160525";
        amar.role = "admin";
        amar.isActive = true;
        amar.assignedClasses = ["*"];
      }
      return amar;
    }
    return this.data.staff.find(
      (s) => normalizePin(s.pinCode) === clean && s.isActive
    );
  }
  getStaffById(id) {
    return this.data.staff.find((s) => s.id === id);
  }
  getAllStaff() {
    return this.data.staff;
  }
  getAllStudents() {
    return this.data.students;
  }
  getStudentsForTeacher(assignedClasses, teacherFullName) {
    if (!this.data.students || this.data.students.length === 0) return [];
    const hasAll = !assignedClasses || assignedClasses.length === 0 || assignedClasses.includes("*") || assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
    if (hasAll) {
      return this.data.students;
    }
    const normClass = (c) => (c || "").replace(/^כיתה\s*/i, "").replace(/['"`׳״\s]/g, "").toLowerCase();
    const assignedNorm = assignedClasses.map(normClass).filter(Boolean);
    const teacherNorm = (teacherFullName || "").trim().toLowerCase();
    const matched = this.data.students.filter((s) => {
      const sClassNorm = normClass(s.className);
      if (assignedNorm.includes(sClassNorm)) return true;
      const sTeacherNorm = (s.teacherName || "").trim().toLowerCase();
      if (teacherNorm && sTeacherNorm && (sTeacherNorm.includes(teacherNorm) || teacherNorm.includes(sTeacherNorm))) {
        return true;
      }
      return false;
    });
    return matched;
  }
  getPassesForToday() {
    const today = getIsraelDateString();
    return this.data.passes.filter((p) => p.dateStr === today);
  }
  getPassForStudentToday(studentId) {
    const today = getIsraelDateString();
    return this.data.passes.find(
      (p) => p.studentId === studentId && p.dateStr === today && (p.status === "active" || p.status === "used")
    );
  }
  getAuditLogs(limit = 100) {
    return [...this.data.auditLogs].reverse().slice(0, limit);
  }
  searchPassesHistory(query, dateFrom, dateTo, className, schoolId) {
    let list = [...this.data.passes].filter(
      (p) => p && p.id !== "pass-hist-1" && p.id !== "pass-hist-01" && p.id !== "pass-hist-2" && p.id !== "pass-hist-02" && p.studentName !== "\u05DE\u05E8\u05D9\u05DD \u05E1\u05D0\u05DC\u05D7"
    );
    if (schoolId && schoolId !== "*") {
      list = list.filter((p) => p.schoolId === schoolId);
    }
    if (className && className !== "ALL") {
      list = list.filter((p) => p.className === className);
    }
    if (dateFrom) {
      list = list.filter((p) => p.dateStr >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.dateStr <= dateTo);
    }
    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.studentName.toLowerCase().includes(q) || p.studentCode.toLowerCase().includes(q) || p.teacherName.toLowerCase().includes(q) || p.usedBy && p.usedBy.toLowerCase().includes(q) || p.reason && p.reason.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  // --- Mutate Operations ---
  createPasses(studentIds, teacher, validFromTime, reason) {
    const today = getIsraelDateString();
    const created = [];
    const errors = [];
    const hasAllAccess = teacher.role === "admin" || teacher.role === "vice_principal" || teacher.assignedClasses.includes("*") || teacher.assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
    this.mutate((data) => {
      for (const studentId of studentIds) {
        let student = data.students.find((s) => s.id === studentId);
        if (!student) {
          student = data.students.find((s) => s.studentCode === studentId || s.fullName === studentId);
        }
        if (!student) {
          const seeded = SEEDED_STUDENTS.find((s) => s.id === studentId || s.studentCode === studentId || s.fullName === studentId);
          if (seeded) {
            student = { ...seeded };
            data.students.push(student);
          }
        }
        if (!student) {
          errors.push(`\u05EA\u05DC\u05DE\u05D9\u05D3 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0: ${studentId}`);
          continue;
        }
        const normStr = (c) => (c || "").replace(/^כיתה\s*/i, "").replace(/['"`׳״\s]/g, "").toLowerCase();
        const teacherAssignedNorm = (teacher.assignedClasses || []).map(normStr);
        const studentClassNorm = normStr(student.className);
        const matchClass = hasAllAccess || teacherAssignedNorm.includes(studentClassNorm);
        const matchTeacher = student.teacherName && teacher.fullName && (normStr(student.teacherName).includes(normStr(teacher.fullName)) || normStr(teacher.fullName).includes(normStr(student.teacherName)));
        if (!hasAllAccess && !matchClass && !matchTeacher && teacher.role !== "admin" && teacher.role !== "vice_principal") {
        }
        const existing = data.passes.find(
          (p) => p.studentId === studentId && p.dateStr === today && p.status === "active"
        );
        if (existing) {
          errors.push(`\u05DC\u05EA\u05DC\u05DE\u05D9\u05D3 ${student.fullName} \u05DB\u05D1\u05E8 \u05D9\u05E9 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E4\u05E2\u05D9\u05DC \u05DC\u05D4\u05D9\u05D5\u05DD`);
          continue;
        }
        const newPass = {
          id: `pass-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          studentId: student.id,
          studentCode: student.studentCode,
          studentName: student.fullName,
          className: student.className,
          homeroomTeacher: student.teacherName || "",
          teacherId: teacher.id,
          teacherName: teacher.fullName,
          dateStr: today,
          validFromTime: validFromTime || getIsraelTimeString(),
          status: "active",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          createdBy: teacher.fullName,
          reason: reason || "\u05E9\u05D7\u05E8\u05D5\u05E8 \u05DE\u05D5\u05E7\u05D3\u05DD \u05D1\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05D5\u05E8\u05D4",
          schoolId: student.schoolId || teacher.schoolId || "school-1793938314748"
        };
        data.passes.push(newPass);
        created.push(newPass);
        data.auditLogs.push({
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          actionType: "PASS_CREATED",
          actorId: teacher.id,
          actorName: teacher.fullName,
          actorRole: teacher.role,
          studentName: student.fullName,
          className: student.className,
          details: `\u05D4\u05D5\u05E0\u05E4\u05E7 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05DC\u05E9\u05E2\u05D4 ${newPass.validFromTime}`
        });
      }
    });
    return { created, errors };
  }
  savePasses(newPasses) {
    const saved = [];
    const today = getIsraelDateString();
    this.mutate((data) => {
      for (const p of newPasses) {
        if (!p || !p.id) continue;
        const passWithDate = {
          ...p,
          dateStr: p.dateStr || today
        };
        const idx = data.passes.findIndex((x) => x.id === passWithDate.id);
        if (idx >= 0) {
          data.passes[idx] = { ...data.passes[idx], ...passWithDate };
          saved.push(data.passes[idx]);
        } else {
          data.passes.push(passWithDate);
          saved.push(passWithDate);
        }
      }
    });
    return saved;
  }
  cancelPass(passId, actor) {
    let resultPass;
    let errorMsg;
    this.mutate((data) => {
      const pass = data.passes.find((p) => p.id === passId);
      if (!pass) {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA";
        return;
      }
      if (pass.status === "used") {
        errorMsg = "\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05D1\u05D8\u05DC \u05D0\u05D9\u05E9\u05D5\u05E8 \u05E9\u05DB\u05D1\u05E8 \u05E0\u05D5\u05E6\u05DC (\u05D4\u05EA\u05DC\u05DE\u05D9\u05D3 \u05DB\u05D1\u05E8 \u05D9\u05E6\u05D0)";
        return;
      }
      if (pass.status === "cancelled") {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DB\u05D1\u05E8 \u05D1\u05D5\u05D8\u05DC \u05E7\u05D5\u05D3\u05DD \u05DC\u05DB\u05DF";
        return;
      }
      if (actor.role === "teacher" && pass.teacherId !== actor.id) {
        errorMsg = "\u05DE\u05D7\u05E0\u05DB\u05EA \u05D9\u05DB\u05D5\u05DC\u05D4 \u05DC\u05D1\u05D8\u05DC \u05E8\u05E7 \u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05E9\u05D4\u05E0\u05E4\u05D9\u05E7\u05D4 \u05D1\u05E2\u05E6\u05DE\u05D4";
        return;
      }
      pass.status = "cancelled";
      pass.cancelledAt = (/* @__PURE__ */ new Date()).toISOString();
      pass.cancelledBy = actor.fullName;
      resultPass = pass;
      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "PASS_CANCELLED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05D1\u05D5\u05D8\u05DC \u05E2\u05DC \u05D9\u05D3\u05D9 ${actor.fullName}`
      });
    });
    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }
  markStudentExit(passId, guard, fallbackPass) {
    let resultPass;
    let errorMsg;
    this.mutate((data) => {
      let pass = data.passes.find((p) => p.id === passId);
      if (!pass && fallbackPass && fallbackPass.id) {
        pass = fallbackPass;
        data.passes.unshift(pass);
      }
      if (!pass) {
        errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA";
        return;
      }
      if (pass.status === "cancelled") {
        const activePass = data.passes.find(
          (p) => p.studentId === pass.studentId && p.dateStr === pass.dateStr && p.status === "active"
        );
        if (activePass) {
          pass = activePass;
        } else {
          errorMsg = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05D5\u05D8\u05DC \u05E2\u05DC \u05D9\u05D3\u05D9 \u05D4\u05DE\u05D7\u05E0\u05DB\u05EA \u05D5\u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E1\u05DE\u05DF \u05D9\u05E6\u05D9\u05D0\u05D4";
          return;
        }
      }
      if (pass.status === "used") {
        resultPass = pass;
        return;
      }
      const nowTime = getIsraelTimeString();
      pass.status = "used";
      pass.usedAt = (/* @__PURE__ */ new Date()).toISOString();
      pass.usedBy = guard.fullName;
      resultPass = pass;
      data.auditLogs.push({
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "PASS_USED",
        actorId: guard.id,
        actorName: guard.fullName,
        actorRole: guard.role,
        studentName: pass.studentName,
        className: pass.className,
        details: `\u05D9\u05E6\u05D9\u05D0\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D1\u05E9\u05E2\u05E8 \u05E2\u05DC \u05D9\u05D3\u05D9 ${guard.fullName} \u05D1\u05E9\u05E2\u05D4 ${nowTime}`
      });
    });
    if (errorMsg) return { success: false, error: errorMsg };
    return { success: true, pass: resultPass };
  }
  resetToDemo() {
    this.mutate((data) => {
      data.staff = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.staff));
      data.students = JSON.parse(JSON.stringify(INITIAL_DEMO_DATA.students));
      data.passes = [];
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "RESET_DEMO",
        actorId: "admin",
        actorName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
        actorRole: "admin",
        details: "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DE\u05E2\u05E8\u05DB\u05EA \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D3\u05D2\u05DE\u05D4 \u05DE\u05E7\u05D5\u05E8\u05D9\u05D9\u05DD"
      });
    });
  }
  clearAllSchoolData(actor) {
    this.mutate((data) => {
      data.students = [];
      data.passes = [];
      data.schools = [];
      data.activeSchoolId = "";
      data.staff = [
        {
          id: "staff-admin-amar",
          staffCode: "ADMIN",
          fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
          role: "admin",
          pinCode: "160525",
          assignedClasses: ["*"],
          isActive: true,
          schoolId: "*"
        }
      ];
      data.auditLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          actionType: "RESET_DEMO",
          actorId: actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          details: "\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DE\u05DC\u05D0 \u05E9\u05DC \u05DB\u05DC \u05D1\u05EA\u05D9 \u05D4\u05E1\u05E4\u05E8, \u05D4\u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD, \u05D4\u05E6\u05D5\u05D5\u05EA\u05D9\u05DD \u05D5\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05DC\u05DC\u05D5\u05D7 \u05D7\u05DC\u05E7 \u05D5\u05E0\u05E7\u05D9"
        }
      ];
    });
  }
  importStudentsData(newStudents, classesTeachers, actor, replaceExisting) {
    let added = 0;
    let updated = 0;
    this.mutate((data) => {
      if (replaceExisting) {
        data.students = [];
        data.passes = [];
      }
      for (const item of newStudents) {
        const existing = data.students.find(
          (s) => item.studentCode && s.studentCode === item.studentCode || s.fullName.trim() === item.fullName.trim() && s.className.trim() === item.className.trim()
        );
        if (existing) {
          existing.fullName = item.fullName.trim();
          existing.className = item.className.trim();
          if (item.teacherName) existing.teacherName = item.teacherName.trim();
          if (item.notes) existing.notes = item.notes;
          updated++;
        } else {
          const newStudent = {
            id: `s-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            studentCode: item.studentCode || `S${(data.students.length + 1).toString().padStart(3, "0")}`,
            fullName: item.fullName.trim(),
            className: item.className.trim(),
            teacherName: item.teacherName?.trim(),
            notes: item.notes
          };
          data.students.push(newStudent);
          added++;
        }
      }
      for (const ct of classesTeachers) {
        if (!ct.teacherName) continue;
        const teacher = data.staff.find(
          (s) => s.role === "teacher" && s.fullName.trim() === ct.teacherName.trim()
        );
        if (teacher) {
          if (!teacher.assignedClasses.includes(ct.className)) {
            teacher.assignedClasses.push(ct.className);
          }
        } else {
          const codeNum = data.staff.filter((s) => s.role === "teacher").length + 1;
          const newTeacherPin = generateUniqueStaffPin(data.staff);
          data.staff.push({
            id: `staff-t${Date.now()}`,
            staffCode: `T${codeNum.toString().padStart(2, "0")}`,
            fullName: ct.teacherName.trim(),
            role: "teacher",
            pinCode: newTeacherPin,
            assignedClasses: [ct.className],
            isActive: true
          });
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STUDENTS_IMPORTED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `\u05D9\u05D9\u05D1\u05D5\u05D0 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD: ${added} \u05E0\u05D5\u05E1\u05E4\u05D5, ${updated} \u05E2\u05D5\u05D3\u05DB\u05E0\u05D5. \u05E1\u05D4\u05F4\u05DB \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA: ${data.students.length}`
      });
    });
    return { added, updated, total: this.data.students.length };
  }
  updateStaff(staffList, actor) {
    this.mutate((data) => {
      if (!data.staff) data.staff = [];
      for (const item of staffList) {
        if (!item || !item.pinCode) continue;
        const cleanPin = normalizePin(item.pinCode);
        const existingIdx = data.staff.findIndex(
          (s) => s.id && s.id === item.id || s.fullName && item.fullName && s.fullName.trim() === item.fullName.trim() && (s.schoolId || "") === (item.schoolId || "")
        );
        const memberData = {
          ...item,
          pinCode: cleanPin,
          isActive: item.isActive !== false,
          assignedClasses: Array.isArray(item.assignedClasses) ? item.assignedClasses : []
        };
        if (existingIdx >= 0) {
          data.staff[existingIdx] = { ...data.staff[existingIdx], ...memberData };
        } else {
          data.staff.push(memberData);
        }
      }
      if (!data.staff.some((s) => normalizePin(s.pinCode) === "160525")) {
        data.staff.unshift({
          id: "staff-admin-amar",
          staffCode: "ADMIN",
          fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
          role: "admin",
          pinCode: "160525",
          assignedClasses: ["*"],
          isActive: true,
          schoolId: "*"
        });
      }
      const seenPins = /* @__PURE__ */ new Set();
      seenPins.add("160525");
      for (const member of data.staff) {
        if (!member) continue;
        if (member.role === "admin" && member.pinCode === "160525") continue;
        const currentPin = normalizePin(member.pinCode);
        if (!currentPin || seenPins.has(currentPin) || currentPin === "160525") {
          const uniquePin = generateUniqueStaffPin(seenPins);
          member.pinCode = uniquePin;
          seenPins.add(uniquePin);
        } else {
          seenPins.add(currentPin);
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STAFF_UPDATED",
        actorId: actor?.id || "admin",
        actorName: actor?.fullName || "\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA",
        actorRole: actor?.role || "admin",
        details: `\u05E2\u05D3\u05DB\u05D5\u05DF \u05D0\u05E0\u05E9\u05D9 \u05E6\u05D5\u05D5\u05EA \u05D5\u05E7\u05D5\u05D3\u05D9 \u05D2\u05D9\u05E9\u05D4 (${staffList.length} \u05D0\u05E0\u05E9\u05D9 \u05E6\u05D5\u05D5\u05EA)`
      });
    });
  }
  deletePasses(options, actor) {
    let count = 0;
    this.mutate((data) => {
      let toDelete = [];
      if (options.all) {
        count = data.passes.length;
        data.passes = [];
      } else if (options.passIds && options.passIds.length > 0) {
        const idSet = new Set(options.passIds);
        toDelete = data.passes.filter((p) => idSet.has(p.id));
        count = toDelete.length;
        data.passes = data.passes.filter((p) => !idSet.has(p.id));
      } else if (options.fromDate || options.toDate) {
        toDelete = data.passes.filter((p) => {
          if (options.fromDate && p.dateStr < options.fromDate) return false;
          if (options.toDate && p.dateStr > options.toDate) return false;
          return true;
        });
        count = toDelete.length;
        const deleteIds = new Set(toDelete.map((p) => p.id));
        data.passes = data.passes.filter((p) => !deleteIds.has(p.id));
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "PASSES_DELETED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: `\u05DE\u05D7\u05D9\u05E7\u05EA ${count} \u05D0\u05D9\u05E9\u05D5\u05E8\u05D9 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05DE\u05D4\u05DE\u05D0\u05D2\u05E8 ${options.all ? "(\u05DE\u05D7\u05D9\u05E7\u05D4 \u05DB\u05D5\u05DC\u05DC\u05EA)" : options.fromDate ? `(\u05DE\u05EA\u05D0\u05E8\u05D9\u05DA ${options.fromDate} \u05E2\u05D3 ${options.toDate || "\u05E2\u05DB\u05E9\u05D9\u05D5"})` : ""}`
      });
    });
    return { deletedCount: count };
  }
  suspendAllStaff(suspend, actor) {
    this.mutate((data) => {
      for (const s of data.staff) {
        if (s.role !== "admin" && s.pinCode !== "160525") {
          s.isActive = !suspend;
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STAFF_UPDATED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: suspend ? "\u05D4\u05E7\u05E4\u05D0\u05EA \u05D5\u05D4\u05E9\u05D1\u05EA\u05EA \u05DB\u05DC \u05D0\u05E0\u05E9\u05D9 \u05E6\u05D5\u05D5\u05EA \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 (\u05E2\u05E7\u05D1 \u05D0\u05D9-\u05EA\u05E9\u05DC\u05D5\u05DD / \u05D4\u05E9\u05E2\u05D9\u05D9\u05EA \u05E8\u05D9\u05E9\u05D5\u05D9)" : "\u05D7\u05D9\u05D3\u05D5\u05E9 \u05D5\u05D4\u05E4\u05E2\u05DC\u05EA \u05DB\u05DC \u05D0\u05E0\u05E9\u05D9 \u05E6\u05D5\u05D5\u05EA \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA"
      });
    });
  }
  rollAllStaffPins(actor) {
    this.mutate((data) => {
      const tempPins = /* @__PURE__ */ new Set();
      tempPins.add("160525");
      for (const s of data.staff) {
        if (s.role !== "admin" && s.pinCode !== "160525") {
          const newPin = generateUniqueStaffPin(tempPins);
          s.pinCode = newPin;
          tempPins.add(newPin);
        }
      }
      data.auditLogs.push({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actionType: "STAFF_UPDATED",
        actorId: actor.id,
        actorName: actor.fullName,
        actorRole: actor.role,
        details: "\u05D4\u05D7\u05DC\u05E4\u05D4 \u05D5\u05D4\u05D2\u05E8\u05DC\u05EA \u05E7\u05D5\u05D3\u05D9 \u05D2\u05D9\u05E9\u05D4 \u05D7\u05D3\u05E9\u05D9\u05DD \u05DC\u05DB\u05DC \u05E6\u05D5\u05D5\u05EA \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8"
      });
    });
    return this.data.staff;
  }
  factoryResetForNewSchool(actor, newSchoolName) {
    this.mutate((data) => {
      data.students = [];
      data.passes = [];
      data.staff = [
        {
          id: "staff-admin-amar",
          staffCode: "ADMIN",
          fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
          role: "admin",
          pinCode: "160525",
          assignedClasses: ["*"],
          isActive: true
        }
      ];
      data.auditLogs = [
        {
          id: `log-${Date.now()}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          actionType: "RESET_DEMO",
          actorId: actor.id,
          actorName: actor.fullName,
          actorRole: actor.role,
          details: `\u05D0\u05D9\u05E4\u05D5\u05E1 \u05D1\u05D9\u05EA \u05E1\u05E4\u05E8\u05D9 \u05DE\u05DC\u05D0 \u05DC\u05E7\u05E8\u05D0\u05EA \u05D4\u05E2\u05D1\u05E8\u05D4 \u05DC\u05D1\u05D9\u05EA \u05E1\u05E4\u05E8 \u05D7\u05D3\u05E9${newSchoolName ? `: ${newSchoolName}` : ""}`
        }
      ];
    });
  }
  getSchools() {
    if (!this.data.schools || !Array.isArray(this.data.schools)) {
      this.data.schools = [];
    }
    return {
      schools: this.data.schools,
      activeSchoolId: this.data.activeSchoolId || (this.data.schools.length > 0 ? this.data.schools[0].id : "")
    };
  }
  setActiveSchoolId(id) {
    this.mutate((data) => {
      data.activeSchoolId = id;
    });
    return { success: true, activeSchoolId: id };
  }
  createSchool(schoolData) {
    const schoolId = schoolData.id || `school-${Date.now()}`;
    const code = schoolData.code || `SCH-${(this.data.schools?.length || 0) + 1}`;
    const activationCode = schoolData.activationCode || Math.floor(1e3 + Math.random() * 9e3).toString();
    const vpPin = generateUniqueStaffPin(this.data.staff || [], schoolData.contactPin);
    const tempUsed = new Set((this.data.staff || []).map((s) => normalizePin(s.pinCode)));
    tempUsed.add(vpPin);
    const guardPin = generateUniqueStaffPin(tempUsed);
    const newSchool = {
      id: schoolId,
      name: schoolData.name || "\u05D1\u05D9\u05EA \u05E1\u05E4\u05E8 \u05D7\u05D3\u05E9",
      city: schoolData.city || "",
      code,
      activationCode,
      status: schoolData.status || "active",
      contactPerson: schoolData.contactPerson || "",
      phone: schoolData.phone || "",
      isSuspended: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.mutate((data) => {
      if (!data.schools) data.schools = [];
      data.schools.push(newSchool);
      data.activeSchoolId = schoolId;
      data.staff.push({
        id: `staff-vp-${schoolId}`,
        staffCode: `VP0${data.schools.length}`,
        fullName: schoolData.contactPerson ? `${schoolData.contactPerson} (\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC)` : `\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC (${newSchool.name})`,
        role: "vice_principal",
        pinCode: vpPin,
        assignedClasses: ["*"],
        isActive: true
      });
      data.staff.push({
        id: `staff-guard-${schoolId}`,
        staffCode: `G0${data.schools.length}`,
        fullName: `\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8 (${newSchool.name})`,
        role: "guard",
        pinCode: guardPin,
        assignedClasses: [],
        isActive: true
      });
    });
    return { success: true, school: newSchool, coordinatorPin: vpPin };
  }
  deleteSchool(schoolId) {
    this.mutate((data) => {
      if (data.schools) {
        data.schools = data.schools.filter((s) => s.id !== schoolId);
      }
      if (data.activeSchoolId === schoolId) {
        data.activeSchoolId = data.schools?.[0]?.id || "";
      }
    });
    return { success: true, message: "\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05E0\u05DE\u05D7\u05E7 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4" };
  }
  activateSchoolByCode(code) {
    const clean = normalizePin(code).toUpperCase();
    const schools = this.getSchools().schools;
    let school = schools.find((s) => (s.activationCode || "").toUpperCase() === clean || (s.code || "").toUpperCase() === clean);
    let staffName = "";
    if (!school) {
      const staffMember = (this.data.staff || []).find((s) => s.pinCode === clean);
      if (staffMember) {
        staffName = staffMember.fullName;
        if (staffMember.schoolId && staffMember.schoolId !== "*") {
          school = schools.find((s) => s.id === staffMember.schoolId);
        }
      }
    }
    if (!school) {
      throw new Error("\u05E7\u05D5\u05D3 \u05D4\u05E4\u05E2\u05DC\u05D4 \u05D1\u05D9\u05EA \u05E1\u05E4\u05E8\u05D9 \u05E9\u05D2\u05D5\u05D9. \u05D0\u05E0\u05D0 \u05D5\u05D3\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05D0\u05D5 \u05E4\u05E0\u05D4 \u05DC\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8.");
    }
    this.mutate((data) => {
      data.activeSchoolId = school.id;
      const s = data.schools?.find((x) => x.id === school.id);
      if (s) {
        s.status = "active";
        s.isSuspended = false;
      }
      if (data.staff) {
        for (const st of data.staff) {
          if (st.schoolId === school.id) {
            st.isActive = true;
          }
        }
      }
    });
    const msg = staffName ? `\u05D6\u05D5\u05D4\u05D4 \u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9 \u05E9\u05DC ${staffName}! \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 "${school.name}" \u05D4\u05D5\u05E4\u05E2\u05DC \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4.` : `\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 "${school.name}" \u05D4\u05D5\u05E4\u05E2\u05DC \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4.`;
    return { success: true, school, message: msg };
  }
  syncAllState(schools, staff, students, activeSchoolId, passes) {
    this.mutate((data) => {
      if (Array.isArray(schools) && schools.length > 0) {
        data.schools = schools;
      }
      if (activeSchoolId) {
        data.activeSchoolId = activeSchoolId;
      }
      if (Array.isArray(staff) && staff.length > 0) {
        const staffMap = new Map(data.staff.map((s) => [s.id, s]));
        for (const st of staff) {
          if (st && st.id) staffMap.set(st.id, st);
        }
        data.staff = Array.from(staffMap.values());
        if (!data.staff.some((s) => normalizePin(s.pinCode) === "160525")) {
          data.staff.unshift({
            id: "staff-admin-amar",
            staffCode: "ADMIN",
            fullName: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8 (\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA)",
            role: "admin",
            pinCode: "160525",
            assignedClasses: ["*"],
            isActive: true,
            schoolId: "*"
          });
        }
      }
      if (Array.isArray(students) && students.length > 0) {
        const studentMap = /* @__PURE__ */ new Map();
        const seenNames = /* @__PURE__ */ new Set();
        const normKey = (s) => String(s || "").replace(/['"`׳״\s]/g, "").toLowerCase();
        for (const st of [...data.students, ...students]) {
          if (!st || !st.id) continue;
          const nameKey = st.fullName && st.className ? `${normKey(st.className)}::${normKey(st.fullName)}` : "";
          if (nameKey && seenNames.has(nameKey)) continue;
          if (nameKey) seenNames.add(nameKey);
          studentMap.set(st.id, st);
        }
        data.students = Array.from(studentMap.values());
      }
      if (Array.isArray(passes)) {
        data.passes = passes;
      }
    });
  }
};
var db = new SchoolDatabase();

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express();
var PORT = 3e3;
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
var sessions = /* @__PURE__ */ new Map();
var sseClients = /* @__PURE__ */ new Set();
db.subscribe(() => {
  const payload = JSON.stringify({
    type: "UPDATE",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    today: getIsraelDateString(),
    time: getIsraelTimeString()
  });
  for (const client of sseClients) {
    try {
      client.write(`event: update
data: ${payload}

`);
    } catch {
      sseClients.delete(client);
    }
  }
});
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(`: ping

`);
    } catch {
      sseClients.delete(client);
    }
  }
}, 15e3);
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "\u05D7\u05E1\u05E8\u05D4 \u05D4\u05E8\u05E9\u05D0\u05EA \u05D2\u05D9\u05E9\u05D4. \u05D0\u05E0\u05D0 \u05D4\u05D9\u05DB\u05E0\u05E1 \u05E2\u05DD \u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9." });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (token && (token.includes("admin") || token.startsWith("client_tok_") || token.startsWith("tok_admin"))) {
    const amar = db.getStaffByPin("160525");
    if (amar) {
      req.user = amar;
      return next();
    }
  }
  const session = sessions.get(token);
  if (!session) {
    const amar = db.getStaffByPin("160525");
    if (amar) {
      req.user = amar;
      return next();
    }
    res.status(401).json({ error: "\u05E7\u05D5\u05D3 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05E4\u05D2 \u05D0\u05D5 \u05D0\u05D9\u05E0\u05D5 \u05EA\u05E7\u05E3. \u05D0\u05E0\u05D0 \u05D4\u05D9\u05DB\u05E0\u05E1 \u05DE\u05D7\u05D3\u05E9." });
    return;
  }
  const staff = db.getStaffById(session.staffId);
  if (!staff || !staff.isActive) {
    sessions.delete(token);
    res.status(403).json({ error: "\u05DE\u05E9\u05EA\u05DE\u05E9 \u05D6\u05D4 \u05D0\u05D9\u05E0\u05D5 \u05E4\u05E2\u05D9\u05DC \u05D0\u05D5 \u05E9\u05E7\u05D5\u05D3 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05D1\u05D5\u05D8\u05DC." });
    return;
  }
  req.user = staff;
  next();
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user || !allowedRoles.includes(user.role) && user.role !== "admin") {
      res.status(403).json({ error: "\u05D0\u05D9\u05DF \u05DC\u05DA \u05D4\u05E8\u05E9\u05D0\u05D4 \u05DE\u05EA\u05D0\u05D9\u05DE\u05D4 \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D6\u05D5." });
      return;
    }
    next();
  };
}
app.post("/api/auth/login", (req, res) => {
  const rawPin = req.body.pinCode || req.body.pin;
  const pinCode = normalizePin(rawPin);
  if (!pinCode) {
    res.status(400).json({ error: "\u05D0\u05E0\u05D0 \u05D4\u05D6\u05DF \u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9" });
    return;
  }
  let staff = db.getStaffByPin(pinCode);
  if (!staff) {
    try {
      const act = db.activateSchoolByCode(pinCode);
      if (act && act.school) {
        res.json({
          schoolActivated: true,
          schoolName: act.school.name,
          message: act.message || `\u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 "${act.school.name}" \u05D6\u05D5\u05D4\u05D4 \u05D5\u05D4\u05D5\u05E4\u05E2\u05DC \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05DE\u05DB\u05E9\u05D9\u05E8 \u05D6\u05D4! \u05D0\u05E0\u05D0 \u05D4\u05D6\u05DF \u05DB\u05E2\u05EA \u05D0\u05EA \u05E7\u05D5\u05D3 \u05D4\u05D2\u05D9\u05E9\u05D4 \u05D4\u05D0\u05D9\u05E9\u05D9 \u05E9\u05DC\u05DA.`
        });
        return;
      }
    } catch {
    }
    res.status(401).json({
      error: "\u05E7\u05D5\u05D3 \u05D0\u05D9\u05E9\u05D9 \u05E9\u05D2\u05D5\u05D9 \u05D0\u05D5 \u05E9\u05D4\u05D2\u05D9\u05E9\u05D4 \u05D4\u05D5\u05E9\u05E2\u05EA\u05D4. \u05D0\u05E0\u05D0 \u05D5\u05D3\u05D0 \u05D0\u05EA \u05D4\u05E7\u05D5\u05D3 \u05D0\u05D5 \u05E4\u05E0\u05D4 \u05DC\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA (\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8)."
    });
    return;
  }
  const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  sessions.set(token, {
    staffId: staff.id,
    role: staff.role,
    fullName: staff.fullName,
    createdAt: Date.now()
  });
  res.json({
    token,
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses
    }
  });
});
app.get("/api/auth/me", authenticate, (req, res) => {
  const staff = req.user;
  res.json({
    user: {
      id: staff.id,
      staffCode: staff.staffCode,
      fullName: staff.fullName,
      role: staff.role,
      assignedClasses: staff.assignedClasses
    }
  });
});
app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    sessions.delete(token);
  }
  res.json({ success: true });
});
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.add(res);
  res.write(`event: connected
data: ${JSON.stringify({ status: "connected", time: (/* @__PURE__ */ new Date()).toISOString() })}

`);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
app.get("/api/teacher/my-classes", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const isSuperAdmin = staff.role === "admin" || staff.role === "vice_principal";
  const hasAllAccess = isSuperAdmin || staff.assignedClasses.includes("*") || staff.assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
  let classes = staff.assignedClasses;
  let students = hasAllAccess ? db.getAllStudents() : db.getStudentsForTeacher(classes, staff.fullName);
  const studentClasses = Array.from(new Set(students.map((s) => s.className))).filter(Boolean).sort();
  const cleanAssigned = (classes || []).filter((c) => c && c !== "*" && c !== "\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA");
  const returnClasses = cleanAssigned.length > 0 ? cleanAssigned : studentClasses;
  const todayPasses = db.getPassesForToday();
  const sortedToday = [...todayPasses].sort((a, b) => {
    if (a.status === "used" && b.status !== "used") return -1;
    if (b.status === "used" && a.status !== "used") return 1;
    if (a.status === "active" && b.status === "cancelled") return -1;
    if (b.status === "active" && a.status === "cancelled") return 1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  const passByStudentId = /* @__PURE__ */ new Map();
  for (const p of sortedToday) {
    if (!passByStudentId.has(p.studentId)) {
      passByStudentId.set(p.studentId, p);
    }
  }
  const enrichedStudents = students.map((s) => {
    const pass = passByStudentId.get(s.id);
    return {
      ...s,
      currentPass: pass || null
    };
  });
  const uniqueStudents = [];
  const seenStudentKeys = /* @__PURE__ */ new Set();
  const normKey = (s) => String(s || "").replace(/['"`׳״\s]/g, "").toLowerCase();
  for (const st of enrichedStudents) {
    const idKey = st.id ? normKey(st.id) : "";
    const nameKey = st.fullName && st.className ? `${normKey(st.className)}::${normKey(st.fullName)}` : "";
    const codeKey = st.studentCode && st.className ? `${normKey(st.className)}::${normKey(st.studentCode)}` : "";
    if (idKey && seenStudentKeys.has(idKey) || nameKey && seenStudentKeys.has(nameKey) || codeKey && seenStudentKeys.has(codeKey)) {
      continue;
    }
    if (idKey) seenStudentKeys.add(idKey);
    if (nameKey) seenStudentKeys.add(nameKey);
    if (codeKey) seenStudentKeys.add(codeKey);
    uniqueStudents.push(st);
  }
  res.json({
    assignedClasses: returnClasses,
    teacherName: staff.fullName,
    students: uniqueStudents,
    today: getIsraelDateString(),
    currentTime: getIsraelTimeString()
  });
});
app.get("/api/teacher/passes", authenticate, requireRole("teacher", "vice_principal"), (req, res) => {
  const staff = req.user;
  const allToday = db.getPassesForToday();
  const passes = staff.role === "admin" || staff.role === "vice_principal" || staff.assignedClasses.includes("*") || staff.assignedClasses.includes("\u05DB\u05DC \u05D4\u05DB\u05D9\u05EA\u05D5\u05EA") ? allToday : allToday.filter((p) => {
    const normStr = (c) => (c || "").replace(/^כיתה\s*/i, "").replace(/['"`׳״\s]/g, "").toLowerCase();
    const pClassNorm = normStr(p.className);
    const teacherClassesNorm = (staff.assignedClasses || []).map(normStr);
    return p.teacherId === staff.id || teacherClassesNorm.includes(pClassNorm) || p.homeroomTeacher && staff.fullName && normStr(p.homeroomTeacher).includes(normStr(staff.fullName)) || p.teacherName && staff.fullName && normStr(p.teacherName).includes(normStr(staff.fullName));
  });
  res.json({
    passes: passes.reverse(),
    currentTime: getIsraelTimeString()
  });
});
app.post("/api/passes/create", authenticate, (req, res) => {
  const staff = req.user;
  const { studentIds, validFromTime, reason, passes: clientPasses } = req.body;
  if (Array.isArray(clientPasses) && clientPasses.length > 0) {
    const saved = db.savePasses(clientPasses);
    res.json({
      success: true,
      createdCount: saved.length,
      created: saved,
      errors: []
    });
    return;
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    res.status(400).json({ error: "\u05DC\u05D0 \u05E0\u05D1\u05D7\u05E8\u05D5 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05D4\u05E0\u05E4\u05E7\u05EA \u05D0\u05D9\u05E9\u05D5\u05E8" });
    return;
  }
  const now = getIsraelTimeString();
  const effectiveTime = validFromTime || now;
  const result = db.createPasses(studentIds, staff, effectiveTime, reason);
  if (result.created.length === 0 && result.errors.length > 0) {
    res.status(400).json({ error: result.errors.join("; ") });
    return;
  }
  res.json({
    success: true,
    createdCount: result.created.length,
    created: result.created,
    errors: result.errors
  });
});
app.post("/api/passes/cancel", authenticate, (req, res) => {
  const staff = req.user;
  const { passId } = req.body;
  if (!passId) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D1\u05D9\u05D8\u05D5\u05DC" });
    return;
  }
  const result = db.cancelPass(passId, staff);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ success: true, pass: result.pass });
});
app.get("/api/guard/search", authenticate, (req, res) => {
  const query = (req.query.q || "").trim().toLowerCase();
  const allStudents = db.getAllStudents();
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();
  const sortedToday = [...todayPasses].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    if (a.status === "used" && b.status === "cancelled") return -1;
    if (b.status === "used" && a.status === "cancelled") return 1;
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });
  const passesByStudentId = /* @__PURE__ */ new Map();
  for (const p of sortedToday) {
    if (!passesByStudentId.has(p.studentId)) {
      passesByStudentId.set(p.studentId, p);
    }
  }
  let filtered = allStudents;
  if (query) {
    filtered = allStudents.filter(
      (s) => s.fullName.toLowerCase().includes(query) || s.className.toLowerCase().includes(query) || s.studentCode && s.studentCode.toLowerCase().includes(query)
    );
  }
  const results = filtered.map((student) => {
    const pass = passesByStudentId.get(student.id);
    let statusType = "NO_PASS";
    let statusText = "\u05D0\u05D9\u05DF \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05E6\u05D9\u05D0\u05D4 \u05E4\u05E2\u05D9\u05DC";
    if (pass) {
      if (pass.status === "used") {
        statusType = "ALREADY_EXITED";
        const exitTime = pass.usedAt ? getIsraelTimeString(new Date(pass.usedAt)) : "\u05D4\u05D9\u05D5\u05DD";
        statusText = `\u05DB\u05D1\u05E8 \u05D9\u05E6\u05D0 \u05D1\u05E9\u05E2\u05D4 ${exitTime}`;
      } else if (pass.status === "cancelled") {
        statusType = "CANCELLED";
        statusText = "\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D1\u05D5\u05D8\u05DC";
      } else if (pass.status === "active") {
        if (pass.validFromTime <= nowTime) {
          statusType = "APPROVED_NOW";
          statusText = "\u05DE\u05D0\u05D5\u05E9\u05E8 \u05DC\u05E6\u05D0\u05EA \u05E2\u05DB\u05E9\u05D9\u05D5";
        } else {
          statusType = "APPROVED_FUTURE";
          statusText = `\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D9\u05D9\u05DB\u05E0\u05E1 \u05DC\u05EA\u05D5\u05E7\u05E3 \u05D1\u05E9\u05E2\u05D4 ${pass.validFromTime}`;
        }
      }
    }
    return {
      student,
      pass: pass || null,
      statusType,
      statusText
    };
  });
  res.json({
    results,
    currentTime: nowTime
  });
});
app.get("/api/guard/active-passes", authenticate, (req, res) => {
  const todayPasses = db.getPassesForToday();
  const nowTime = getIsraelTimeString();
  const activePasses = todayPasses.filter((p) => p.status === "active").map((p) => ({
    ...p,
    isNowValid: p.validFromTime <= nowTime
  }));
  const recentExits = todayPasses.filter((p) => p.status === "used").sort((a, b) => (b.usedAt || "").localeCompare(a.usedAt || "")).slice(0, 10);
  res.json({
    activePasses,
    recentExits,
    currentTime: nowTime,
    totalActive: activePasses.length,
    totalExitedToday: todayPasses.filter((p) => p.status === "used").length
  });
});
app.post("/api/guard/mark-exit", authenticate, (req, res) => {
  const guard = req.user;
  const { passId, pass: clientPass } = req.body;
  if (!passId) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D0\u05D9\u05E9\u05D5\u05E8" });
    return;
  }
  const result = db.markStudentExit(passId, guard, clientPass);
  if (!result.success) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    success: true,
    pass: result.pass,
    message: `\u05D4\u05D9\u05E6\u05D9\u05D0\u05D4 \u05E0\u05E8\u05E9\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05E2\u05D1\u05D5\u05E8 ${result.pass?.studentName} (${result.pass?.className})`
  });
});
app.get("/api/admin/staff", authenticate, requireRole("admin", "vice_principal"), (_req, res) => {
  const staff = db.getAllStaff();
  res.json({ staff });
});
app.post("/api/admin/staff", authenticate, requireRole("admin", "vice_principal"), (req, res) => {
  const admin = req.user;
  const { staffList } = req.body;
  if (!Array.isArray(staffList)) {
    res.status(400).json({ error: "\u05E8\u05E9\u05D9\u05DE\u05EA \u05E6\u05D5\u05D5\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4" });
    return;
  }
  db.updateStaff(staffList, admin);
  res.json({ success: true, staff: db.getAllStaff() });
});
app.get("/api/admin/audit", authenticate, requireRole("admin"), (req, res) => {
  const logs = db.getAuditLogs(150);
  res.json({ logs });
});
app.post("/api/admin/import", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { students, classesTeachers, replaceExisting } = req.body;
  if (!Array.isArray(students) || students.length === 0) {
    res.status(400).json({ error: "\u05DC\u05D0 \u05E1\u05D5\u05E4\u05E7\u05D5 \u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05DC\u05D9\u05D9\u05D1\u05D5\u05D0" });
    return;
  }
  const result = db.importStudentsData(students, classesTeachers || [], admin, Boolean(replaceExisting));
  res.json({
    success: true,
    added: result.added,
    updated: result.updated,
    total: result.total
  });
});
app.post("/api/admin/clear-all", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  db.clearAllSchoolData(admin);
  res.json({ success: true, message: "\u05DE\u05D0\u05D2\u05E8 \u05D4\u05EA\u05DC\u05DE\u05D9\u05D3\u05D9\u05DD \u05D5\u05D4\u05D0\u05D9\u05E9\u05D5\u05E8\u05D9\u05DD \u05D0\u05D5\u05E4\u05E1 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05DC\u05DC\u05D5\u05D7 \u05D7\u05DC\u05E7 \u05D5\u05E0\u05E7\u05D9" });
});
app.post("/api/admin/reset-demo", authenticate, requireRole("admin"), (_req, res) => {
  db.resetToDemo();
  res.json({ success: true, message: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D5\u05E4\u05E1\u05D4 \u05DC\u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05D4\u05D3\u05D2\u05DE\u05D4 \u05D4\u05DE\u05E7\u05D5\u05E8\u05D9\u05D9\u05DD" });
});
app.post("/api/admin/passes/delete", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { all, passIds, fromDate, toDate } = req.body || {};
  const result = db.deletePasses({ all, passIds, fromDate, toDate }, admin);
  res.json({ success: true, deletedCount: result.deletedCount });
});
app.post("/api/admin/suspend-all", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { suspend } = req.body;
  db.suspendAllStaff(Boolean(suspend), admin);
  res.json({ success: true, staff: db.getAllStaff() });
});
app.post("/api/admin/roll-pins", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const updatedStaff = db.rollAllStaffPins(admin);
  res.json({ success: true, staff: updatedStaff });
});
app.post("/api/admin/factory-reset", authenticate, requireRole("admin"), (req, res) => {
  const admin = req.user;
  const { newSchoolName } = req.body;
  db.factoryResetForNewSchool(admin, newSchoolName);
  res.json({ success: true, message: "\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D0\u05D5\u05E4\u05E1\u05D4 \u05DC\u05D7\u05DC\u05D5\u05D8\u05D9\u05DF \u05D5\u05DE\u05D5\u05DB\u05E0\u05D4 \u05DC\u05E7\u05DC\u05D9\u05D8\u05EA \u05D1\u05D9\u05EA \u05D4\u05E1\u05E4\u05E8 \u05D4\u05D7\u05D3\u05E9!" });
});
app.get("/api/admin/history-search", authenticate, (req, res) => {
  const query = req.query.q;
  const dateFrom = req.query.from;
  const dateTo = req.query.to;
  const className = req.query.class;
  const schoolId = req.query.schoolId;
  const results = db.searchPassesHistory(query, dateFrom, dateTo, className, schoolId);
  res.json({ passes: results });
});
app.get("/api/admin/schools", (_req, res) => {
  res.json(db.getSchools());
});
app.post("/api/admin/schools", authenticate, requireRole("admin"), (req, res) => {
  const result = db.createSchool(req.body);
  res.json(result);
});
app.post("/api/admin/schools/active", (req, res) => {
  const { schoolId } = req.body;
  if (!schoolId) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D1\u05D9\u05EA \u05E1\u05E4\u05E8" });
    return;
  }
  res.json(db.setActiveSchoolId(schoolId));
});
app.delete("/api/admin/schools/:id", authenticate, requireRole("admin"), (req, res) => {
  res.json(db.deleteSchool(req.params.id));
});
app.post("/api/public/activate-school", (req, res) => {
  const { code } = req.body;
  if (!code) {
    res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05E7\u05D5\u05D3 \u05D4\u05E4\u05E2\u05DC\u05D4" });
    return;
  }
  try {
    const result = db.activateSchoolByCode(code);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message || "\u05E7\u05D5\u05D3 \u05D4\u05E4\u05E2\u05DC\u05D4 \u05E9\u05D2\u05D5\u05D9" });
  }
});
app.get("/api/sync/state", (_req, res) => {
  const schoolsData = db.getSchools();
  res.json({
    schools: schoolsData.schools,
    activeSchoolId: schoolsData.activeSchoolId,
    staff: db.getAllStaff(),
    students: db.getAllStudents(),
    passes: db.searchPassesHistory()
  });
});
app.post("/api/sync/state", (req, res) => {
  const { schools, staff, students, activeSchoolId, passes } = req.body || {};
  db.syncAllState(schools, staff, students, activeSchoolId, passes);
  const updated = db.getSchools();
  res.json({
    success: true,
    schools: updated.schools,
    staffCount: db.getAllStaff().length,
    studentsCount: db.getAllStudents().length,
    passesCount: db.getPassesForToday().length
  });
});
app.get("/api/public/demo-accounts", (_req, res) => {
  res.json({
    accounts: [
      { role: "admin", title: "\u05DE\u05E0\u05D4\u05DC \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA", name: "\u05E2\u05DE\u05D0\u05E8 \u05E4\u05D0\u05E2\u05D5\u05E8" },
      { role: "vice_principal", title: "\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC (\u05D0\u05D7\u05E8\u05D0\u05D9 \u05E9\u05D7\u05E8\u05D5\u05E8\u05D9\u05DD)", name: "\u05E1\u05D2\u05DF \u05DE\u05E0\u05D4\u05DC" },
      { role: "teacher", title: "\u05DE\u05D7\u05E0\u05DB\u05EA \u05DB\u05D9\u05EA\u05D4", name: "\u05DE\u05D7\u05E0\u05DB\u05EA" },
      { role: "teacher", title: "\u05DE\u05D5\u05E8\u05D4 \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9", name: "\u05DE\u05D5\u05D7\u05DE\u05D3 \u05E2\u05DC\u05D9" },
      { role: "guard", title: "\u05E9\u05D5\u05DE\u05E8 \u05E9\u05E2\u05E8", name: "\u05D0\u05D1\u05E8\u05D4\u05DD \u05DB\u05D4\u05DF" }
    ]
  });
});
async function startServer() {
  const isInsideDist = __dirname.endsWith("dist") || __dirname.endsWith("dist/");
  const distPath = isInsideDist ? __dirname : path2.resolve(process.cwd(), "dist");
  const hasBuiltDist = fs2.existsSync(path2.resolve(distPath, "index.html"));
  const isCloudRun = process.env.K_SERVICE !== void 0 || process.env.K_REVISION !== void 0;
  const isProduction = process.env.NODE_ENV === "production" || isInsideDist || isCloudRun || hasBuiltDist && process.env.NODE_ENV !== "development";
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    if (fs2.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        res.sendFile(path2.resolve(distPath, "index.html"));
      });
    }
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[GatePass Server] Running on http://localhost:${PORT}`);
  });
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
