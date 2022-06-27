"use strict";
/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
exports.__esModule = true;
exports.IUniswapV2__factory = void 0;
var ethers_1 = require("ethers");
var _abi = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amountIn",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "amountOutMin",
                type: "uint256"
            },
            {
                internalType: "address[]",
                name: "path",
                type: "address[]"
            },
            {
                internalType: "address",
                name: "to",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256"
            },
        ],
        name: "swapExactTokensForTokens",
        outputs: [
            {
                internalType: "uint256[]",
                name: "amounts",
                type: "uint256[]"
            },
        ],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "amountOut",
                type: "uint256"
            },
            {
                internalType: "uint256",
                name: "amountInMax",
                type: "uint256"
            },
            {
                internalType: "address[]",
                name: "path",
                type: "address[]"
            },
            {
                internalType: "address",
                name: "to",
                type: "address"
            },
            {
                internalType: "uint256",
                name: "deadline",
                type: "uint256"
            },
        ],
        name: "swapTokensForExactTokens",
        outputs: [
            {
                internalType: "uint256[]",
                name: "amounts",
                type: "uint256[]"
            },
        ],
        stateMutability: "nonpayable",
        type: "function"
    },
];
var IUniswapV2__factory = /** @class */ (function () {
    function IUniswapV2__factory() {
    }
    IUniswapV2__factory.createInterface = function () {
        return new ethers_1.utils.Interface(_abi);
    };
    IUniswapV2__factory.connect = function (address, signerOrProvider) {
        return new ethers_1.Contract(address, _abi, signerOrProvider);
    };
    IUniswapV2__factory.abi = _abi;
    return IUniswapV2__factory;
}());
exports.IUniswapV2__factory = IUniswapV2__factory;
