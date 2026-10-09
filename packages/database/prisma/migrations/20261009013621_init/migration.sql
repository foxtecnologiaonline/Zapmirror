-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "License" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trial',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "License_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceName" TEXT NOT NULL,
    "evolutionApiKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "phoneNumber" TEXT,
    "qrCode" TEXT,
    "lastConnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirrorInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mirrorInstanceId" TEXT,
    "adbSerial" TEXT NOT NULL,
    "label" TEXT,
    "connectionType" TEXT NOT NULL DEFAULT 'usb',
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "License_userId_idx" ON "License"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorInstance_instanceName_key" ON "MirrorInstance"("instanceName");

-- CreateIndex
CREATE INDEX "MirrorInstance_userId_idx" ON "MirrorInstance"("userId");

-- CreateIndex
CREATE INDEX "MirrorDevice_userId_idx" ON "MirrorDevice"("userId");

-- AddForeignKey
ALTER TABLE "License" ADD CONSTRAINT "License_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorInstance" ADD CONSTRAINT "MirrorInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorDevice" ADD CONSTRAINT "MirrorDevice_mirrorInstanceId_fkey" FOREIGN KEY ("mirrorInstanceId") REFERENCES "MirrorInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
