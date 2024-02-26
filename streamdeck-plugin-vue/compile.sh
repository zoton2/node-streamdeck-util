#!/bin/bash

if [  -L "./Release" ]; then
  mkdir "./Release"
fi

npm run build

rm ./Release/com.zoton2.example.sdPlugin > /dev/null 2>&1

zip -r ./Release/com.zoton2.example.sdPlugin.zip com.zoton2.example.sdPlugin/

mv ./Release/com.zoton2.example.sdPlugin.zip ./Release/com.zoton2.example.streamDeckPlugin

read -p "Press any key to continue..."
