import { getShapeInfo, genXmlColorSelection, genXmlTextCommand, genXmlBodyProperties, inch2Emu } from '../utils/helpers';
import OptionAdapter from '../utils/slideHelpers/optionAdapter.js';
import { moveTo, lnTo, quadBezTo } from './pathHelpers';
const ONEPT = 12700, EMU = 914400;

export default class Shape {

    constructor(shapeObject) {

        this.shapeObject = shapeObject;
        this.coordinate = OptionAdapter(this.shapeObject)
    }

    fixMargin() {
        // Lines can have zero cy, but text should not
        let {cy} = this.coordinate;
        if (!this.shapeObject.options.line && cy == 0) cy = (EMU * 0.3);

        // Margin/Padding/Inset for textboxes
        if (this.shapeObject.options.margin && Array.isArray(this.shapeObject.options.margin)) {

            this.shapeObject.options.bodyProp.lIns = (this.shapeObject.options.margin[0] * ONEPT || 0);
            this.shapeObject.options.bodyProp.rIns = (this.shapeObject.options.margin[1] * ONEPT || 0);
            this.shapeObject.options.bodyProp.bIns = (this.shapeObject.options.margin[2] * ONEPT || 0);
            this.shapeObject.options.bodyProp.tIns = (this.shapeObject.options.margin[3] * ONEPT || 0);
        } else if ((this.shapeObject.options.margin || this.shapeObject.options.margin == 0) && Number.isInteger(this.shapeObject.options.margin)) {
            this.shapeObject.options.bodyProp.lIns = (this.shapeObject.options.margin * ONEPT);
            this.shapeObject.options.bodyProp.rIns = (this.shapeObject.options.margin * ONEPT);
            this.shapeObject.options.bodyProp.bIns = (this.shapeObject.options.margin * ONEPT);
            this.shapeObject.options.bodyProp.tIns = (this.shapeObject.options.margin * ONEPT);
        }
        return this; //.shapeObject;
    }

    setShapeProperty(idx) {

        let isTextBox = this.shapeObject.options && this.shapeObject.options.isTextBox,
            {x, y, cx, cy, locationAttr} = this.coordinate;

        //B: The addition of the "txBox" attribute is the sole determiner of if an object is a Shape or Textbox
        let aStr;
        aStr = [
            `<p:sp>`,
            `<p:nvSpPr><p:cNvPr id="${(idx + 2)}" name="Object ${(idx + 1)}"/>`,
            `<p:cNvSpPr ${(isTextBox) ? ' txBox="1"/><p:nvPr/>' : '/><p:nvPr/>'}`,
            `</p:nvSpPr>`,
            `<p:spPr><a:xfrm${locationAttr}>`,
            `<a:off x="${x}" y="${y}"/>`,
            `<a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`];

        this._xmlShape = aStr.join('');
        return this;
    }


    setPrstGeom() {

        let { shapeType } = this.coordinate;

        if (shapeType == null) shapeType = getShapeInfo(null);
        if (this.shapeObject.options && this.shapeObject.options.customGeom) {
            if (shapeType.name === 'polyline'){
                this._xmlShape += `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>${this.createPolyline()}</a:custGeom>`;
            }else if (shapeType.name === 'polygon') {
                this._xmlShape += `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/>${this.createPolyline('polygon')}</a:custGeom>`;
            }else if (shapeType.name === 'chevron') {
                this._xmlShape += `<a:prstGeom prst="${shapeType.name}">${this.shapeObject.options.customGeom}</a:prstGeom>`;
            }

        } else {
            this._xmlShape += `<a:prstGeom prst="${shapeType.name}"><a:avLst/></a:prstGeom>`;
        }


        return this;
    }

    fillOption() {
        if (this.shapeObject.options) {

            if(this.shapeObject.options.fill){
                this._xmlShape += genXmlColorSelection(this.shapeObject.options.fill)
            }else{
                this._xmlShape += '<a:noFill/>';
            }
        }
         return this;
    }

    lineOption(){

            if (this.shapeObject.options.line) {
                var lineAttr = '';

                if (this.shapeObject.options.line_size > 1) lineAttr += ` w="${(this.shapeObject.options.line_size * ONEPT)}"`;
                this._xmlShape += `<a:ln${lineAttr}>`;
                this._xmlShape += genXmlColorSelection(this.shapeObject.options.line);
                if (this.shapeObject.options && this.shapeObject.options.dash){
                    this._xmlShape += `<a:prstDash val="${this.shapeObject.options.dash}"/>`
                }
                if (this.shapeObject.options.line_head) this._xmlShape += `<a:headEnd type="${this.shapeObject.options.line_head}"/>`;
                if (this.shapeObject.options.line_tail) this._xmlShape += `<a:tailEnd type="${this.shapeObject.options.line_tail}"/>`;
                this._xmlShape += '</a:ln>';
            }

        return this;
    }

    effectOption() {
        if (this.shapeObject.options.effects) {

            for (var ii = 0, total_size_ii = this.shapeObject.options.effects.length; ii < total_size_ii; ii++) {
                switch (this.shapeObject.options.effects[ii].type) {

                    case 'outerShadow':
                        effectsList += cbGenerateEffects(this.shapeObject.options.effects[ii], 'outerShdw');
                        break;
                    case 'innerShadow':
                        effectsList += cbGenerateEffects(this.shapeObject.options.effects[ii], 'innerShdw');
                        break;
                }
            }
        }
        return this;
    }

    closeShapeProperty() {
        this._xmlShape += '</p:spPr>';
        return this;
    }

    txBody(inSlide) {

        let moreStyles = '',
            moreStylesAttr = '',
            outStyles = '',
            styleData = '';
        
        if (this.shapeObject.options) {
            if (this.shapeObject.options.align) {
                switch (this.shapeObject.options.align) {
                    case 'right':
                        moreStylesAttr += ' algn="r"';
                        break;
                    case 'center':
                        moreStylesAttr += ' algn="ctr"';
                        break;
                    case 'justify':
                        moreStylesAttr += ' algn="just"';
                        break;
                }
            }

            if (this.shapeObject.options.indentLevel > 0) moreStylesAttr += ' lvl="' + this.shapeObject.options.indentLevel + '"';
        }

        if (moreStyles != '') outStyles = '<a:pPr' + moreStylesAttr + '>' + moreStyles + '</a:pPr>';
        else if (moreStylesAttr != '') outStyles = '<a:pPr' + moreStylesAttr + '/>';

        if (styleData != '') strSlideXml += '<p:style>' + styleData + '</p:style>';

        if (typeof this.shapeObject.text == 'string') {

            this._xmlShape += '<p:txBody>' + genXmlBodyProperties(this.shapeObject.options) + '<a:lstStyle/><a:p>' + outStyles;
            this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text, inSlide.slide, inSlide.slide.getPageNumber());

        } else if (typeof this.shapeObject.text == 'number') {

            this._xmlShape += '<p:txBody>' + genXmlBodyProperties(this.shapeObject.options) + '<a:lstStyle/><a:p>' + outStyles;
            this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text + '', inSlide.slide, inSlide.slide.getPageNumber());

        } else if (this.shapeObject.text && this.shapeObject.text.length) {
            var outBodyOpt = genXmlBodyProperties(this.shapeObject.options);
            this._xmlShape += '<p:txBody>' + outBodyOpt + '<a:lstStyle/><a:p>' + outStyles;

            for (var j = 0, total_size_j = this.shapeObject.text.length; j < total_size_j; j++) {
                if ((typeof this.shapeObject.text[j] == 'object') && this.shapeObject.text[j].text) {
                    this._xmlShape += genXmlTextCommand(this.shapeObject.text[j].options || this.shapeObject.options, this.shapeObject.text[j].text, inSlide.slide, outBodyOpt, outStyles, inSlide.slide.getPageNumber());
                } else if (typeof this.shapeObject.text[j] == 'string') {
                    this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text[j], inSlide.slide, outBodyOpt, outStyles, inSlide.slide.getPageNumber());
                } else if (typeof this.shapeObject.text[j] == 'number') {
                    this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text[j] + '', inSlide.slide, outBodyOpt, outStyles, inSlide.slide.getPageNumber());
                } else if ((typeof this.shapeObject.text[j] == 'object') && this.shapeObject.text[j].field) {
                    this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text[j], inSlide.slide, outBodyOpt, outStyles, inSlide.slide.getPageNumber());
                }
            }
        } else if ((typeof this.shapeObject.text == 'object') && this.shapeObject.text.field) {
            this._xmlShape += '<p:txBody>' + genXmlBodyProperties(this.shapeObject.options) + '<a:lstStyle/><a:p>' + outStyles;
            this._xmlShape += genXmlTextCommand(this.shapeObject.options, this.shapeObject.text, inSlide.slide, inSlide.slide.getPageNumber());
        }

        // We must add that at the end of every paragraph with text:
        if (typeof this.shapeObject.text !== 'undefined') {
            var font_size = '';
            if (this.shapeObject.options && this.shapeObject.options.font_size) font_size = ` sz="${this.shapeObject.options.font_size}00"`;
            this._xmlShape += `<a:endParaRPr lang="en-US"${font_size} dirty="0"/></a:p></p:txBody>`;
        }
        return this;
    }

    closeShape(){
        let sEndShape;
        (this.shapeObject.type == 'cxn') ? sEndShape ='</p:cxnSp>' : sEndShape = '</p:sp>';
        this._xmlShape += sEndShape;
        return this;
    }

    createPolyline(type){

        let aPath = this.shapeObject.options && this.shapeObject.options.customGeom,
            w = this.coordinate.cx,  h = this.coordinate.cy,
            {x, y} = this.coordinate,
            polyline = `<a:pathLst><a:path w="${inch2Emu(w)}" h="${inch2Emu(h)}">`;
        for (let nIndex=0; nIndex < aPath.length; nIndex++){
            switch (aPath[nIndex][0]){
                case 'M':
                    polyline += moveTo(aPath[nIndex]);
                    break;
                case 'L':
                    polyline += lnTo(aPath[nIndex]);
                    break;
                case 'Q':
                    polyline += quadBezTo(aPath[nIndex]);
                    break;
            }
        }

        type === 'polygon' ? polyline += '<a:close/></a:path></a:pathLst>' : polyline += '</a:path></a:pathLst>';

        return polyline;
    }

    generateShape(idx, inSlide){
        this.fixMargin()
            .setShapeProperty(idx)
            .setPrstGeom()
            .fillOption()
            .lineOption()
            .effectOption()
            .closeShapeProperty()
            .txBody(inSlide)
            .closeShape();
        return this._xmlShape;
    }

}