FROM node:10.15.0-jessie

RUN mkdir /root/collabobot

WORKDIR /root/collabobot

COPY . /root/collabobot

RUN npm install

RUN npm audit fix

EXPOSE 5000
